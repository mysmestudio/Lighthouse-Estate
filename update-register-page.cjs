const fs = require('fs');
let code = fs.readFileSync('src/pages/RegisterPage.tsx', 'utf8');

const oldHandlePin = `  const handlePinComplete = async (pin: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await registerResident({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        houseNumber: parseInt(houseNumber, 10),
        houseUnit: unit,
        pin: pin
      });
      
      if (res.success) {
        // Success - navigate to a success page or login
        alert('Registration submitted successfully! You will be able to log in once Estate Admin approves your account.');
        navigate('/login');
      } else {
        setErrorMsg(res.error || 'Failed to register');
        setStep(1); // Go back so they can see error
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred during registration');
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };`;

const newHandlePin = `  const [isSuccess, setIsSuccess] = useState(false);
  const handlePinComplete = async (pin: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await registerResident({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        houseNumber: parseInt(houseNumber, 10),
        houseUnit: unit,
        pin: pin,
        nokName: nokName.trim(),
        nokPhone: nokPhone.trim(),
        nokRelation: nokRelation.trim(),
        madrasa,
        mosque,
        volunteer
      });
      
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMsg(res.error || 'Failed to register');
        setStep(1); // Go back so they can see error
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred during registration');
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };`;

code = code.replace(oldHandlePin, newHandlePin);

const successReturn = `  if (isSuccess) {
    return (
      <div className="shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '40px 20px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--deep)', color: '#fff' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 24, color: '#fff' }}>
          ✓
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Registration submitted</h1>
        <p className="muted" style={{ marginBottom: 32, fontSize: 15, color: 'rgba(255,255,255,.7)' }}>
          Your profile is being reviewed by Estate Admin and will be approved within 24 hours. You will be able to log in once approved.
        </p>
        <button className="btn btn-ghost-light" style={{ borderColor: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    );
  }

  return (`;

code = code.replace("  return (\n    <div className=\"shell\">", successReturn + "\n    <div className=\"shell\">");

fs.writeFileSync('src/pages/RegisterPage.tsx', code);
