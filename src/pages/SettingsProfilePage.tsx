import React, { useState, useRef } from 'react';
import { 
  User, 
  Home, 
  Phone, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  Bell, 
  Car, 
  HeartHandshake, 
  Check, 
  AlertCircle, 
  LogOut, 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Clock,
  Sparkles,
  Lock,
  ChevronRight
} from 'lucide-react';
import { AppUser, HouseUnitType } from '../types';
import { updateResidentProfileSettings, validateResidentPin } from '../lib/auth-helpers';
import { triggerSOSEvent } from '../lib/sos-service';

interface SettingsProfilePageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
  onUserUpdated: (user: AppUser) => void;
  onLogout: () => void;
}

const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const SettingsProfilePage: React.FC<SettingsProfilePageProps> = ({
  currentUser,
  navigate,
  onUserUpdated,
  onLogout
}) => {
  // Form State
  const [fullName, setFullName] = useState(currentUser?.full_name || 'Dr. Tariq Al-Mansoor');
  const [phone, setPhone] = useState(currentUser?.phone || '+234 803 123 4567');
  const [email, setEmail] = useState(currentUser?.email || 'resident.h14@lighthouseestate.app');
  const [houseNumber, setHouseNumber] = useState<number>(currentUser?.house_number || 14);
  const [houseUnit, setHouseUnit] = useState<HouseUnitType>(currentUser?.house_unit || 'Main House');
  
  // Emergency Contact State
  const [emergencyName, setEmergencyName] = useState(currentUser?.emergency_contact_name || 'Dr. Amina Al-Mansoor');
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser?.emergency_contact_phone || '+234 802 987 6543');
  const [emergencyRelation, setEmergencyRelation] = useState(currentUser?.emergency_relationship || 'Spouse');

  // Vehicle License Plates
  const [vehicles, setVehicles] = useState<string[]>(
    currentUser?.vehicle_plates && currentUser.vehicle_plates.length > 0
      ? currentUser.vehicle_plates
      : ['KJA-849-EZ', 'LSR-204-AA']
  );
  const [newPlateInput, setNewPlateInput] = useState('');

  // Notification Preferences
  const [notifyGate, setNotifyGate] = useState(currentUser?.notify_gate_alerts ?? true);
  const [notifyNotices, setNotifyNotices] = useState(currentUser?.notify_notices ?? true);
  const [notifySms, setNotifySms] = useState(currentUser?.notify_sms ?? true);

  // Security PIN Update
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Status feedback
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddVehicle = () => {
    const plate = newPlateInput.trim().toUpperCase();
    if (!plate) return;
    if (vehicles.includes(plate)) {
      setSaveError('This vehicle plate is already registered.');
      return;
    }
    setVehicles([...vehicles, plate]);
    setNewPlateInput('');
    setSaveError(null);
  };

  const handleRemoveVehicle = (plateToRemove: string) => {
    setVehicles(vehicles.filter((p) => p !== plateToRemove));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    if (!fullName.trim()) {
      setSaveError('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setSaveError('Phone Number is required.');
      return;
    }

    // If updating PIN, validate format
    let pinToUpdate: string | undefined = undefined;
    if (isChangingPin) {
      if (!newPin.trim()) {
        setSaveError('Please enter your new 6-character PIN.');
        return;
      }
      if (newPin.trim().toUpperCase() !== confirmPin.trim().toUpperCase()) {
        setSaveError('New PIN and confirmation PIN do not match.');
        return;
      }
      const pinValidation = validateResidentPin(newPin.trim().toUpperCase());
      if (!pinValidation.isValid) {
        setSaveError(pinValidation.message || 'PIN must be 6 characters (4 digits and 2 uppercase letters).');
        return;
      }
      pinToUpdate = newPin.trim().toUpperCase();
    }

    setSaveLoading(true);

    const userId = currentUser?.id || 'user-res-1';
    const updates: Partial<AppUser> = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      house_number: houseNumber,
      house_unit: houseUnit,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
      emergency_relationship: emergencyRelation.trim() || undefined,
      vehicle_plates: vehicles,
      notify_gate_alerts: notifyGate,
      notify_notices: notifyNotices,
      notify_sms: notifySms,
    };

    if (pinToUpdate) {
      updates.pin = pinToUpdate;
    }

    try {
      const res = updateResidentProfileSettings(userId, updates);
      if (res.success && res.user) {
        onUserUpdated(res.user);
        setSaveSuccess('Account & profile settings updated successfully.');
        setIsChangingPin(false);
        setNewPin('');
        setConfirmPin('');
        setCurrentPin('');
      } else {
        setSaveError(res.error || 'Failed to update settings.');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  // SOS Press & Hold
  const handleSOSStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (sosActivated) return;

    setIsHoldingSOS(true);
    setSosTransition(`stroke-dashoffset ${SOS_HOLD_MS / 1000}s linear`);
    setSosProgressOffset(0);

    sosTimerRef.current = setTimeout(async () => {
      setSosActivated(true);
      setIsHoldingSOS(false);
      setShowSosToast(true);

      if (currentUser) {
        try {
          await triggerSOSEvent(currentUser);
        } catch (err) {
          console.error(err);
        }
      }

      setTimeout(() => {
        setSosActivated(false);
        setShowSosToast(false);
        setSosTransition('none');
        setSosProgressOffset(SOS_RING_LENGTH);
      }, 4000);
    }, SOS_HOLD_MS);
  };

  const handleSOSCancel = () => {
    if (sosActivated) return;
    if (sosTimerRef.current) {
      clearTimeout(sosTimerRef.current);
      sosTimerRef.current = null;
    }
    setIsHoldingSOS(false);
    setSosTransition('none');
    setSosProgressOffset(SOS_RING_LENGTH);
  };

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TA';

  return (
    <div className="min-h-screen bg-[#FBFDF9] text-[#16241D] font-sans pb-32">
      {/* SVG Lattice Background Pattern Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="settings-lattice" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Floating Pillbar Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 py-4 bg-[#123528]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-xs">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-7 h-7 rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
            title="Light House Estate, Lekki"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#0D2A1F]">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-['Sora'] font-bold text-xs sm:text-sm text-white tracking-tight">
            House {houseNumber} · {houseUnit}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-2.5 py-1 shadow-xs">
          <button
            onClick={() => navigate('/notices')}
            className="relative w-8 h-8 rounded-full bg-white/14 border border-white/16 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            aria-label="Notifications"
          >
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E8C547] border border-[#123528]" />
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora'] font-bold text-xs">
            {initials}
          </div>
        </div>
      </header>

      {/* Hero Header with Lattice Pattern */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-4 sm:px-6 pt-6 pb-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#settings-lattice)" />
        </svg>

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora'] font-extrabold text-2xl shadow-md border-2 border-white/20 shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-[#3FAE7A]/25 text-[#76dfa8] text-[10.5px] font-['Sora'] font-bold uppercase tracking-wider border border-[#3FAE7A]/30">
                    Verified Resident
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-[10.5px] font-bold">
                    House {houseNumber}
                  </span>
                </div>
                <h1 className="font-['Sora'] font-bold text-xl sm:text-2xl tracking-tight text-white">
                  {fullName}
                </h1>
                <p className="text-xs text-white/70">
                  Manage resident profile, security PIN, vehicles, and notification preferences
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-['Sora'] font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto border border-white/15"
            >
              <LogOut className="w-3.5 h-3.5 text-[#F0645F]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rounded Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Feedback Messages */}
          {saveError && (
            <div className="p-4 rounded-2xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-xs font-semibold flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {saveSuccess && (
            <div className="p-4 rounded-2xl bg-[#EAF7EE] border border-[#3FAE7A]/30 text-[#257A54] text-xs font-semibold flex items-center gap-2.5 shadow-xs">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">

            {/* SECTION 1: Personal & Resident Info */}
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#E3EFE7]">
                <div className="w-8 h-8 rounded-xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-['Sora'] font-bold text-sm text-[#16241D]">
                    Personal & Household Info
                  </h2>
                  <p className="text-[11px] text-[#8AA096]">Primary contact information for gate clearance & estate records</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A] transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Phone Number (WhatsApp Active) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A] transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Estate Email / Account ID
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                      House Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(parseInt(e.target.value) || 14)}
                      className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                      House Unit
                    </label>
                    <select
                      value={houseUnit}
                      onChange={(e) => setHouseUnit(e.target.value as HouseUnitType)}
                      className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                    >
                      <option value="Main House">Main House</option>
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="First Floor">First Floor</option>
                      <option value="BQ">BQ</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Emergency SOS & Next of Kin */}
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#E3EFE7]">
                <div className="w-8 h-8 rounded-xl bg-[#FCEBEB] text-[#C23A38] flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-['Sora'] font-bold text-sm text-[#16241D]">
                    Emergency SOS & Next-of-Kin
                  </h2>
                  <p className="text-[11px] text-[#8AA096]">Designated responder notified during estate emergency dispatches</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Dr. Amina Al-Mansoor"
                    className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+234 802 987 6543"
                    className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Relationship
                  </label>
                  <select
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: Registered Vehicles */}
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#E3EFE7]">
                <div className="w-8 h-8 rounded-xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-['Sora'] font-bold text-sm text-[#16241D]">
                    Registered Vehicles & License Plates
                  </h2>
                  <p className="text-[11px] text-[#8AA096]">Automatic gate barrier recognition and resident lane clearance</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {vehicles.map((plate) => (
                    <div
                      key={plate}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] text-xs font-mono font-bold text-[#16241D]"
                    >
                      <Car className="w-3.5 h-3.5 text-[#257A54]" />
                      <span>{plate}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicle(plate)}
                        className="text-[#8AA096] hover:text-[#C23A38] ml-1 transition-colors"
                        title="Remove plate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    placeholder="e.g. KJA-849-EZ"
                    value={newPlateInput}
                    onChange={(e) => setNewPlateInput(e.target.value)}
                    className="flex-1 h-9 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#3FAE7A]"
                  />
                  <button
                    type="button"
                    onClick={handleAddVehicle}
                    className="px-3.5 h-9 rounded-xl bg-[#EAF7EE] border border-[#3FAE7A]/30 text-[#257A54] font-['Sora'] font-bold text-xs hover:bg-[#3FAE7A] hover:text-white transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Plate</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 4: Security PIN Management */}
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2.5 mb-4 pb-3 border-b border-[#E3EFE7]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FBF3D9] text-[#B4922C] flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-['Sora'] font-bold text-sm text-[#16241D]">
                      House Security Access PIN
                    </h2>
                    <p className="text-[11px] text-[#8AA096]">6-character estate validation PIN for fast login and gate approvals</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChangingPin(!isChangingPin)}
                  className="text-xs font-bold text-[#257A54] hover:underline"
                >
                  {isChangingPin ? 'Cancel PIN Change' : 'Change PIN'}
                </button>
              </div>

              {isChangingPin ? (
                <div className="space-y-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-[#FBF3D9]/40 border border-[#B4922C]/30 text-xs text-[#516459] leading-relaxed">
                    <strong className="text-[#16241D] block mb-0.5">PIN Format Requirement:</strong>
                    Must contain exactly <span className="font-bold text-[#257A54]">4 digits</span> and <span className="font-bold text-[#257A54]">2 uppercase letters</span> (e.g. <code className="bg-white px-1.5 py-0.5 rounded border font-bold">1A2B3C</code> or <code className="bg-white px-1.5 py-0.5 rounded border font-bold">4928AB</code>).
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                        New 6-Character PIN
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 4928AB"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.toUpperCase())}
                        className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm font-mono font-bold uppercase tracking-widest text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                        Confirm New PIN
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 4928AB"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.toUpperCase())}
                        className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm font-mono font-bold uppercase tracking-widest text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7]">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#8AA096]" />
                    <span className="text-xs font-mono font-bold text-[#16241D] tracking-widest">
                      ••••••
                    </span>
                    <span className="text-[11px] text-[#8AA096]">(PIN is secured and encrypted)</span>
                  </div>
                  <span className="text-xs font-bold text-[#257A54]">Active</span>
                </div>
              )}
            </div>

            {/* SECTION 5: Notification Preferences */}
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#E3EFE7]">
                <div className="w-8 h-8 rounded-xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-['Sora'] font-bold text-sm text-[#16241D]">
                    Notification & Alert Preferences
                  </h2>
                  <p className="text-[11px] text-[#8AA096]">Control how you receive estate and gate arrival alerts</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] cursor-pointer hover:border-[#3FAE7A]/40 transition-colors">
                  <div>
                    <span className="font-['Sora'] font-bold text-xs text-[#16241D] block">
                      Visitor Arrival Gate Alerts
                    </span>
                    <span className="text-[11px] text-[#8AA096]">
                      Instant notification when visitor pass is scanned at main gate
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyGate}
                    onChange={(e) => setNotifyGate(e.target.checked)}
                    className="w-4 h-4 accent-[#257A54] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] cursor-pointer hover:border-[#3FAE7A]/40 transition-colors">
                  <div>
                    <span className="font-['Sora'] font-bold text-xs text-[#16241D] block">
                      Estate Notices & Townhall Alerts
                    </span>
                    <span className="text-[11px] text-[#8AA096]">
                      Important security broadcasts, facility maintenance, and voting ballots
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyNotices}
                    onChange={(e) => setNotifyNotices(e.target.checked)}
                    className="w-4 h-4 accent-[#257A54] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] cursor-pointer hover:border-[#3FAE7A]/40 transition-colors">
                  <div>
                    <span className="font-['Sora'] font-bold text-xs text-[#16241D] block">
                      SMS Backup Delivery
                    </span>
                    <span className="text-[11px] text-[#8AA096]">
                      Send critical security alerts via SMS when offline
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                    className="w-4 h-4 accent-[#257A54] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saveLoading}
                className="w-full py-3.5 rounded-2xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveLoading ? 'Saving Settings...' : 'Save Account Settings'}</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Floating Bottom Dock */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0D2A1F]/92 backdrop-blur-md border border-white/10 p-2 rounded-full shadow-2xl">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
          </svg>
          <span className="text-[8.5px] font-bold">Home</span>
        </button>
        <button
          onClick={() => navigate('/passes')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3H5a3 3 0 01-3-3V9z" />
            <path d="M9 14h6" />
          </svg>
          <span className="text-[8.5px] font-bold">Passes</span>
        </button>
        <button
          onClick={() => navigate('/facilities')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6z" />
          </svg>
          <span className="text-[8.5px] font-bold">Facilities</span>
        </button>
        <button
          onClick={() => navigate('/household')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15 20c0-2.4 1-4 3.5-4.3" />
          </svg>
          <span className="text-[8.5px] font-bold">Staff</span>
        </button>
        <button
          onClick={() => navigate('/notices')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
          <span className="text-[8.5px] font-bold">Notices</span>
        </button>
      </nav>

      {/* Floating Emergency SOS Button */}
      <div className="fixed right-4 bottom-5 w-[70px] h-[70px] z-50">
        <svg className="absolute inset-0 w-[70px] h-[70px] -rotate-90 pointer-events-none" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="31" stroke="rgba(18,53,40,0.12)" strokeWidth="4" fill="none" />
          <circle
            cx="35"
            cy="35"
            r="31"
            stroke="#C23A38"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={SOS_RING_LENGTH}
            strokeDashoffset={sosProgressOffset}
            style={{ transition: sosTransition }}
          />
        </svg>

        <button
          onMouseDown={handleSOSStart}
          onMouseUp={handleSOSCancel}
          onMouseLeave={handleSOSCancel}
          onTouchStart={handleSOSStart}
          onTouchEnd={handleSOSCancel}
          onTouchCancel={handleSOSCancel}
          className={`absolute top-[7px] left-[7px] w-14 h-14 rounded-full border-none bg-gradient-to-br from-[#F0645F] to-[#C23A38] flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg select-none touch-none ${
            isHoldingSOS ? 'scale-95' : 'animate-pulse'
          } ${sosActivated ? 'bg-gradient-to-br from-[#FF6E68] to-[#D2413F] scale-105' : ''}`}
          aria-label="Hold for 5 seconds for SOS"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 16H3L12 3z" />
            <line x1="12" y1="9" x2="12" y2="14" />
            <circle cx="12" cy="17" r="0.6" fill="white" stroke="none" />
          </svg>
          <span className="font-['Sora'] font-extrabold text-[8.5px] tracking-wider text-white">SOS</span>
        </button>

        {showSosToast && (
          <div className="absolute bottom-20 right-0 bg-[#0D2A1F] border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
            Alert sent to gate security
          </div>
        )}
      </div>
    </div>
  );
};
