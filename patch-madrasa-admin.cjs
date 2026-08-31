const fs = require('fs');
let code = fs.readFileSync('src/pages/MadrasaAdminPage.tsx', 'utf8');

if (!code.includes("import { getAppUsers }")) {
  code = code.replace("import { AppUser, MadrasaStudent", "import { getAppUsers } from '../lib/auth-helpers';\nimport { AppUser, MadrasaStudent");
}

const targetState = `  const [students, setStudents] = useState<MadrasaStudent[]>([]);`;
const replacementState = `  const [students, setStudents] = useState<MadrasaStudent[]>([]);
  const [interestedHouseholds, setInterestedHouseholds] = useState<AppUser[]>([]);`;
code = code.replace(targetState, replacementState);

const loadEffect = `  useEffect(() => {
    setStudents(getStoredMadrasaStudents());
    setAttendance(getStoredMadrasaAttendance());
    setStaff(getStoredMadrasaStaff());
  }, []);`;

const newLoadEffect = `  useEffect(() => {
    setStudents(getStoredMadrasaStudents());
    setAttendance(getStoredMadrasaAttendance());
    setStaff(getStoredMadrasaStaff());
    getAppUsers().then(users => {
      setInterestedHouseholds(users.filter(u => u.madrasa_enrolment === true));
    });
  }, []);`;
code = code.replace(loadEffect, newLoadEffect);

const statsTarget = `<div className="stat"><div className="n gold">{pendingStudents.length}</div><div className="k">Pending enrolments</div></div>`;
const statsReplacement = `<div className="stat"><div className="n gold">{pendingStudents.length + interestedHouseholds.length}</div><div className="k">Pending / Interested</div></div>`;
code = code.replace(statsTarget, statsReplacement);

const pendingSectionTarget = `{pendingStudents.length > 0 && (
          <div className="section">
            <div className="section-head"><h3>Pending enrolments</h3></div>`;
const pendingSectionReplacement = `{(pendingStudents.length > 0 || interestedHouseholds.length > 0) && (
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
            ))}`;
code = code.replace(pendingSectionTarget, pendingSectionReplacement);

fs.writeFileSync('src/pages/MadrasaAdminPage.tsx', code);
