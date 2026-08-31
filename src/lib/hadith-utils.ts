export interface Hadith {
  quote: string;
  source: string;
}

const HADITHS: Hadith[] = [
  {
    quote: "“The believers, in their mutual love and mercy, are like one body — when a single part aches, the whole body stays awake with fever.”",
    source: "Prophet Muhammad ص · Sahih al-Bukhari & Muslim"
  },
  {
    quote: "“He who believes in Allah and the Last Day should do good to his neighbor.”",
    source: "Prophet Muhammad ص · Sahih al-Bukhari"
  },
  {
    quote: "“The best of you are those who are best to their families.”",
    source: "Prophet Muhammad ص · Sunan al-Tirmidhi"
  },
  {
    quote: "“A good word is charity.”",
    source: "Prophet Muhammad ص · Sahih al-Bukhari & Muslim"
  }
];

export function getDailyHadith(): Hadith {
  // Rotate based on the day of the month so it changes daily
  const dayOfMonth = new Date().getDate();
  return HADITHS[dayOfMonth % 4];
}
