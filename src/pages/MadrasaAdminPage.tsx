import React, { useState, useEffect } from 'react';
import { getAppUsers } from '../lib/auth-helpers';
import { AppUser, MadrasaStudent, MadrasaAttendance, MadrasaStaff } from '../types';
import { 
  getStoredMadrasaStudents, saveStoredMadrasaStudents,
  getStoredMadrasaAttendance, saveStoredMadrasaAttendance,
  getStoredMadrasaStaff
} from '../lib/estate-data';

interface MadrasaAdminPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
  onLogout: () => void;
}

export const MadrasaAdminPage: React.FC<MadrasaAdminPageProps> = ({ currentUser, navigate, onLogout }) => {
  const [students, setStudents] = useState<MadrasaStudent[]>([]);
  const [interestedHouseholds, setInterestedHouseholds] = useState<AppUser[]>([]);
  const [attendance, setAttendance] = useState<MadrasaAttendance[]>([]);
  const [staff, setStaff] = useState<MadrasaStaff[]>([]);
  
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<MadrasaStudent | null>(null);
  
  // Registration form
  const [regName, setRegName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regClass, setRegClass] = useState('Class 1');
  const [regLinkType, setRegLinkType] = useState('house');
  const [regHouse, setRegHouse] = useState('');
  const [regKinName, setRegKinName] = useState('');
  const [regKinPhone, setRegKinPhone] = useState('');
  const [regEmergName, setRegEmergName] = useState('');
  const [regEmergPhone, setRegEmergPhone] = useState('');

  useEffect(() => {
    setStudents(getStoredMadrasaStudents());
    setAttendance(getStoredMadrasaAttendance());
    setStaff(getStoredMadrasaStaff());
    getAppUsers().then(users => {
      setInterestedHouseholds(users.filter(u => u.madrasa_enrolment === true));
    });
  }, []);

  const pendingStudents = students.filter(s => s.status === 'pending');
  const activeStudents = students.filter(s => s.status === 'active');
  const presentToday = attendance.filter(a => a.status === 'present');
  const today = new Date().toISOString().split('T')[0];

  const handleCompleteEnrolment = (studentId: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) return { ...s, status: 'active', enrolled_since: new Date().toLocaleDateString('en-US', {month: 'short', year: 'numeric'}) } as MadrasaStudent;
      return s;
    });
    setStudents(updated);
    saveStoredMadrasaStudents(updated);
  };

  const isCheckedIn = (studentId: string) => {
    return attendance.some(a => a.student_id === studentId && a.date === today && a.status === 'present');
  };

  const getStudentAttendance = (studentId: string) => {
    return attendance.find(a => a.student_id === studentId && a.date === today);
  };

  const toggleAttendance = (studentId: string) => {
    const isCurrentlyIn = isCheckedIn(studentId);
    let updatedAttendance = [...attendance];
    
    if (isCurrentlyIn) {
      // check out
      updatedAttendance = updatedAttendance.map(a => {
        if (a.student_id === studentId && a.date === today && a.status === 'present') {
          return { ...a, status: 'absent' as const, check_out_time: new Date().toISOString() };
        }
        return a;
      });
    } else {
      // check in
      const existing = updatedAttendance.find(a => a.student_id === studentId && a.date === today);
      if (existing) {
        existing.status = 'present';
        existing.check_in_time = new Date().toISOString();
        existing.check_out_time = undefined;
      } else {
        updatedAttendance.push({
          id: Math.random().toString(36).substr(2, 9),
          student_id: studentId,
          date: today,
          status: 'present',
          check_in_time: new Date().toISOString()
        });
      }
    }
    
    setAttendance(updatedAttendance);
    saveStoredMadrasaAttendance(updatedAttendance);
  };

  const handleSaveRegistration = () => {
    if (!regName.trim()) return;
    const newStudent: MadrasaStudent = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: regName,
      house_id: regLinkType === 'external' ? 'House 100' : `House ${regHouse}`,
      house_number: regLinkType === 'external' ? 100 : parseInt(regHouse) || 0,
      class_level: regClass,
      next_of_kin_name: regKinName,
      next_of_kin_phone: regKinPhone,
      emergency_contact_name: regEmergName,
      emergency_contact_phone: regEmergPhone,
      enrolled_since: new Date().toLocaleDateString('en-US', {month: 'short', year: 'numeric'}),
      status: 'active'
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    saveStoredMadrasaStudents(updated);
    closeModals();
  };

  const openStudentModal = (s: MadrasaStudent) => {
    setSelectedStudent(s);
    setShowStudentModal(true);
  };

  const closeModals = () => {
    setShowStudentModal(false);
    setShowRegisterModal(false);
    setSelectedStudent(null);
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  };

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand">
            <span className="mark">&#9737;</span>Lighthouse Lekki
            <span className="roletag">Madrasa</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="icon-btn" onClick={onLogout}>&#9788;</button>
            <span className="avatar" style={{ background: 'var(--gold)', color: 'var(--deep)', fontWeight: 800 }}>MA</span>
          </div>
        </div>
        <h1 style={{ marginTop: 6 }}>Welcome back, Madrasa Admin</h1>
        <p className="muted" style={{ marginTop: 8 }}>{presentToday.length} of {activeStudents.length} students checked in this morning.</p>
      </div>

      <div className="sheet pad">
        <div className="section" style={{ marginTop: 4 }}>
          <div className="stat-row">
            <div className="stat"><div className="n mint">{activeStudents.length}</div><div className="k">Enrolled</div></div>
            <div className="stat"><div className="n mint">{presentToday.length}</div><div className="k">Present today</div></div>
            <div className="stat"><div className="n">{staff.length}</div><div className="k">Staff on duty</div></div>
            <div className="stat"><div className="n gold">{pendingStudents.length + interestedHouseholds.length}</div><div className="k">Pending / Interested</div></div>
          </div>
        </div>

        <div className="section">
          <div className="tiles">
            <div className="tile" onClick={() => setShowRegisterModal(true)}>
              <div className="ico">&#9992;</div><span className="n">Register student</span>
            </div>
            <div className="tile">
              <div className="ico gold">&#9989;</div><span className="n">Check-in / out</span>
            </div>
            <div className="tile" onClick={() => navigate('/notices')}>
              <div className="ico">&#128276;</div><span className="n">Post notice</span>
            </div>
            <div className="tile">
              <div className="ico gold">&#128197;</div><span className="n">Class schedule</span>
            </div>
          </div>
        </div>

        {(pendingStudents.length > 0 || interestedHouseholds.length > 0) && (
          <div className="section">
            <div className="section-head"><h3>Pending & Interested Households</h3></div>
            {interestedHouseholds.map(h => (
              <div className="row" key={h.id}>
                <span className="sq mint">{h.full_name.substring(0, 2).toUpperCase()}</span>
                <div className="grow">
                  <div className="n">House {h.house_number} ({h.house_unit})</div>
                  <div className="d">{h.full_name} indicated interest during registration.</div>
                </div>
                <button className="act ok" onClick={() => { setRegLinkType('house'); setRegHouse(String(h.house_number)); setShowRegisterModal(true); }}>+ Add</button>
              </div>
            ))}
            {pendingStudents.map(s => (
              <div className="row" key={s.id}>
                <span className="sq gold">{s.full_name.substring(0, 2).toUpperCase()}</span>
                <div className="grow">
                  <div className="t">{s.full_name}</div>
                  <div className="s">{s.house_number === 100 ? 'External learner' : `House ${s.house_number}`} &middot; pending enrolment</div>
                </div>
                <button className="act in" onClick={() => handleCompleteEnrolment(s.id)}>Complete</button>
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <div className="section-head"><h3>Attendance today</h3><a className="link" href="#">View all &rarr;</a></div>
          {activeStudents.map(s => {
            const inNow = isCheckedIn(s.id);
            const aRecord = getStudentAttendance(s.id);
            return (
              <div className="row" key={s.id} onClick={() => openStudentModal(s)}>
                <span className={`sq ${inNow ? '' : 'grey'}`}>{s.full_name.substring(0, 2).toUpperCase()}</span>
                <div className="grow">
                  <div className="t">{s.full_name}</div>
                  <div className="s">
                    {s.house_number === 100 ? 'External learner' : `House ${s.house_number}`} &middot; {inNow ? `since ${formatTime(aRecord?.check_in_time!)}` : 'not checked in'}
                  </div>
                </div>
                <button 
                  className={`act ${inNow ? 'in' : 'out'}`} 
                  onClick={(e) => { e.stopPropagation(); toggleAttendance(s.id); }}
                >
                  {inNow ? 'Out' : 'In'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="section">
          <div className="section-head"><h3>Staff on duty</h3></div>
          {staff.map(st => (
            <div className="row" key={st.id}>
              <span className="sq">{st.full_name.substring(0, 2).toUpperCase()}</span>
              <div className="grow">
                <div className="t">{st.full_name}</div>
                <div className="s">{st.class_assigned} &middot; {st.check_in_time ? `since ${formatTime(st.check_in_time)}` : 'not checked in'}</div>
              </div>
              <span className="pill pill-mint">Present</span>
            </div>
          ))}
        </div>

      </div>

      <div className="nav-space" style={{ height: 90 }}></div>

      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0D2A1F]/92 backdrop-blur-md border border-white/10 p-2 rounded-full shadow-2xl">
        <button className="w-12 h-11 border-none bg-[rgba(63,174,122,.22)] rounded-full flex flex-col items-center justify-center gap-0.5 text-white transition-colors cursor-pointer">
          <span className="text-[14px]">&#9737;</span><span className="text-[8px] font-bold">Home</span>
        </button>
        <button className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer">
          <span className="text-[14px]">&#9992;</span><span className="text-[8px] font-bold">Students</span>
        </button>
        <button className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer">
          <span className="text-[14px]">&#9989;</span><span className="text-[8px] font-bold">Attendance</span>
        </button>
        <button className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer">
          <span className="text-[14px]">&#128197;</span><span className="text-[8px] font-bold">Schedule</span>
        </button>
        <button onClick={() => navigate('/notices')} className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer">
          <span className="text-[14px]">&#128276;</span><span className="text-[8px] font-bold">Notices</span>
        </button>
      </nav>

      {/* Scrim */}
      <div className={`scrim ${showStudentModal || showRegisterModal ? 'open' : ''}`} onClick={closeModals}></div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className={`modal ${showStudentModal ? 'open' : ''}`}>
          <div className="grabber"></div>
          <div className="modal-head">
            <h3 id="mName">{selectedStudent.full_name}</h3>
            <button className="close" onClick={closeModals}>&times;</button>
          </div>
          <div className="info-row"><span className="k">Linked to</span><span className="v">{selectedStudent.house_number === 100 ? 'External learner (House 100)' : `House ${selectedStudent.house_number}`}</span></div>
          <div className="info-row"><span className="k">Class / level</span><span className="v">{selectedStudent.class_level}</span></div>
          <div className="info-row"><span className="k">Next of kin</span><span className="v">{selectedStudent.next_of_kin_name}</span></div>
          <div className="info-row"><span className="k">Emergency contact</span><span className="v">{selectedStudent.emergency_contact_phone}</span></div>
          <div className="info-row"><span className="k">Enrolled since</span><span className="v">{selectedStudent.enrolled_since}</span></div>
          
          <button 
            className="btn btn-primary" 
            style={{ marginTop: 20 }} 
            onClick={() => { toggleAttendance(selectedStudent.id); setShowStudentModal(false); }}
          >
            {isCheckedIn(selectedStudent.id) ? 'Check out' : 'Check in'}
          </button>
        </div>
      )}

      {/* Register Student Modal */}
      <div className={`modal ${showRegisterModal ? 'open' : ''}`}>
        <div className="grabber"></div>
        <div className="modal-head">
          <h3>Register a student</h3>
          <button className="close" onClick={closeModals}>&times;</button>
        </div>
        <div className="field">
          <label>Student full name</label>
          <input className="input" placeholder="e.g. Amina Sadiq" value={regName} onChange={e => setRegName(e.target.value)} />
        </div>
        <div className="duo">
          <div className="field">
            <label>Date of birth</label>
            <input className="input" type="date" value={regDob} onChange={e => setRegDob(e.target.value)} />
          </div>
          <div className="field">
            <label>Class / level</label>
            <select className="input" value={regClass} onChange={e => setRegClass(e.target.value)}>
              <option>Class 1</option>
              <option>Class 2</option>
              <option>Class 3</option>
              <option>Class 4</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Linked to</label>
          <select className="input" value={regLinkType} onChange={e => { setRegLinkType(e.target.value); if(e.target.value === 'external') setRegHouse('100'); }}>
            <option value="house">A resident's house</option>
            <option value="external">External learner (not a resident)</option>
          </select>
          <p className="hint">
            {regLinkType === 'external' ? 'External learners are recorded under House 100.' : 'Select the house number this student belongs to.'}
          </p>
        </div>
        {regLinkType === 'house' && (
          <div className="field">
            <label>House number</label>
            <input className="input" placeholder="e.g. 42" value={regHouse} onChange={e => setRegHouse(e.target.value)} />
          </div>
        )}
        <div className="duo">
          <div className="field"><label>Next of kin name</label><input className="input" placeholder="Parent / guardian" value={regKinName} onChange={e => setRegKinName(e.target.value)} /></div>
          <div className="field"><label>Next of kin phone</label><input className="input" type="tel" value={regKinPhone} onChange={e => setRegKinPhone(e.target.value)} /></div>
        </div>
        <div className="duo">
          <div className="field"><label>Emergency contact name</label><input className="input" value={regEmergName} onChange={e => setRegEmergName(e.target.value)} /></div>
          <div className="field"><label>Emergency contact phone</label><input className="input" type="tel" value={regEmergPhone} onChange={e => setRegEmergPhone(e.target.value)} /></div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveRegistration} disabled={!regName.trim()}>Save student</button>
      </div>

    </div>
  );
};
