export const awardCategories = [
  {
    id: "mvp",
    name: "The MVP Award",
    icon: "♛",
    theme: "Gaming",
    description: "Die persoon wat die meeste uitstaan wanneer julle saam speel.",
  },
  {
    id: "skill-issue",
    name: "The Skill Issue Award",
    icon: "GG",
    theme: "Gaming / Roasting",
    description: "Vir die persoon wat soms wonderlike talent toon ... en soms glad nie.",
  },
  {
    id: "comedy",
    name: "The Comedy Award",
    icon: "☻",
    theme: "Humor",
    description: "Vir die persoon wat die meeste lag en humor na die groep bring.",
  },
  {
    id: "rage-machine",
    name: "The Rage Machine Award",
    icon: "✹",
    theme: "Roasting",
    description: "Vir die persoon met die grootste emosionele reaksies.",
  },
  {
    id: "big-brain",
    name: "The Big Brain Award",
    icon: "IQ",
    theme: "Intelligensie / Gaming",
    description: "Vir die persoon wat dink voordat hulle optree (meestal).",
  },
  {
    id: "unhinged",
    name: "The Unhinged Award",
    icon: "⚡",
    theme: "Chaos",
    description: "Vir die persoon wat die meeste chaos veroorsaak.",
  },
  {
    id: "npc",
    name: "The NPC Award",
    icon: "NPC",
    theme: "Gaming / Persoonlikheid",
    description: "Vir die persoon wat soms voel asof hulle uit 'n heel ander speletjie kom.",
  },
  {
    id: "friendly-fire",
    name: "The Friendly Fire Award",
    icon: "⚔",
    theme: "Gaming / Roasting",
    description: "Vir die persoon wat soms gevaarliker vir hul eie span as die vyand is.",
  },
];

const questionSets = [
  {
    category: "mvp",
    kicker: "The MVP Award",
    questions: [
      ["All-round gamer", "Wie is die beste all-round gamer in die groep?"],
      ["Spanredder", "Wie red die span die meeste wanneer alles verkeerd loop?"],
      ["Indrukwekkende plays", "Wie maak die meeste indrukwekkende plays?"],
      ["Eerste span-keuse", "Wie is die persoon wat jy eerste in jou span wil hê wanneer julle ernstig wil wen?"],
      ["Konsekwentste prestasie", "Wie lewer die mees konsekwente prestasie, ongeag watter game julle speel?"],
    ],
  },
  {
    category: "skill-issue",
    kicker: "The Skill Issue Award",
    questions: [
      ["Onnodige foute", "Wie maak die meeste onnodige foute tydens gaming?"],
      ["Maklike situasies", "Wie het die grootste vermoë om 'n maklike situasie te verloor?"],
      ["Hulp met 'n eenvoudige taak", "Wie is die persoon wat die meeste hulp nodig het om 'n eenvoudige taak in 'n game te voltooi?"],
      ["Slegte tydsberekening", "Wie maak die meeste verkeerde besluite op die slegste moontlike oomblik?"],
      ["Verskonings", "Wie blameer gewoonlik die game, lag of controller wanneer iets verkeerd loop?"],
    ],
  },
  {
    category: "comedy",
    kicker: "The Comedy Award",
    questions: [
      ["Spontane humor", "Wie sê die snaaksste goed sonder om dit eers te probeer?"],
      ["Snaakse reaksies", "Wie se reaksies laat almal die meeste lag?"],
      ["Humorsin", "Wie het die snaaksste sin vir humor?"],
      ["Alledaagse opmerkings", "Wie maak die meeste snaakse opmerkings tydens gewone gesprekke?"],
      ["Humor in 'n slegte situasie", "Wie kan 'n slegte situasie in 'n snaakse oomblik verander?"],
    ],
  },
  {
    category: "rage-machine",
    kicker: "The Rage Machine Award",
    questions: [
      ["Rage tydens gaming", "Wie rage die meeste wanneer dinge nie volgens plan verloop nie?"],
      ["Klein probleem, groot drama", "Wie maak die grootste drama oor 'n klein probleem?"],
      ["Geduld wanneer hulle verloor", "Wie verloor die vinnigste hul geduld wanneer hulle verloor?"],
      ["Veranderde reaksies", "Wie se stem of reaksies verander die meeste wanneer hulle kwaad raak?"],
      ["Dramatiese uitskakeling", "Wie kan die meeste dramaties reageer wanneer hulle deur 'n ander speler uitgeskakel word?"],
    ],
  },
  {
    category: "big-brain",
    kicker: "The Big Brain Award",
    questions: [
      ["Strategie", "Wie kom gewoonlik met die slimste strategieë vorendag?"],
      ["Vinnige denke", "Wie kan die beste uit 'n moeilike situasie dink?"],
      ["Probleemoplossing", "Wie is die beste daarin om probleme vinnig op te los?"],
      ["Nuwe games en mechanics", "Wie verstaan nuwe games en mechanics die vinnigste?"],
      ["Uitoorlê", "Wie kan ander die maklikste uitoorlê met hul planne?"],
    ],
  },
  {
    category: "unhinged",
    kicker: "The Unhinged Award",
    questions: [
      ["Onvoorspelbare besluite", "Wie maak die mees onvoorspelbare besluite?"],
      ["Totale chaos", "Wie verander 'n normale gaming-sessie in totale chaos?"],
      ["Impulsiewe optrede", "Wie is die mees waarskynlike persoon om iets heeltemal onnodig of impulsief te doen?"],
      ["Onverwagte probleme", "Wie veroorsaak die meeste onverwagte probleme wanneer julle saam iets probeer doen?"],
      ["Hoekom sou jy dit doen?", "Wie se optrede laat almal gereeld wonder: \"Hoekom sou jy dit doen?\""],
    ],
  },
  {
    category: "npc",
    kicker: "The NPC Award",
    questions: [
      ["Geen konteks", "Wie sê of doen die vreemdste goed sonder enige konteks?"],
      ["NPC in die regte lewe", "Wie tree soms op asof hulle 'n NPC in die regte lewe is?"],
      ["Herhalende stories", "Wie herhaal dieselfde stories, grappies of stellings die meeste?"],
      ["Voorspelbare reaksies", "Wie het die mees voorspelbare reaksies op sekere situasies?"],
      ["NPC-energie", "Wie kan die maklikste met 'n NPC verwar word as jy hulle in 'n game sou plaas?"],
    ],
  },
  {
    category: "friendly-fire",
    kicker: "The Friendly Fire Award",
    questions: [
      ["Gevaar vir die eie span", "Wie is die grootste gevaar vir hul eie span tydens gaming?"],
      ["Spanplanne ontspoor", "Wie is die mees waarskynlike persoon om per ongeluk hul eie span se planne te vernietig?"],
      ["Spanwerk vergeet", "Wie vergeet die meeste dat hulle veronderstel is om saam met die span te werk?"],
      ["Help wat skade doen", "Wie is die mees waarskynlike persoon om hul eie span in die moeilikheid te bring terwyl hulle probeer help?"],
      ["Rugdekking", "Wie is die persoon wat jy die minste vertrou om jou rug te dek tydens 'n game?"],
    ],
  },
];

export const awardQuestions = questionSets.flatMap(({ category, kicker, questions }) =>
  questions.map(([subcategory, prompt], index) => ({
    id: `${category}-${String(index + 1).padStart(2, "0")}`,
    mainCategoryId: category,
    mainCategory: awardCategories.find((item) => item.id === category).name,
    subcategory,
    prompt,
    kicker,
    weight: 1,
  })),
);
