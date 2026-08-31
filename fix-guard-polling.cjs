const fs = require('fs');
let code = fs.readFileSync('src/pages/GuardSosPanelPage.tsx', 'utf8');
code = code.replace(
  "useEffect(() => {\n    setEvents(getStoredSosEvents());\n  }, []);",
  "useEffect(() => {\n    setEvents(getStoredSosEvents());\n    const interval = setInterval(() => {\n      setEvents(getStoredSosEvents());\n    }, 2000);\n    return () => clearInterval(interval);\n  }, []);"
);
fs.writeFileSync('src/pages/GuardSosPanelPage.tsx', code);
