type CommentaryTeam = 'user' | 'ai';
type AttackMode = 'central' | 'wide' | 'transition';

type CommentarySummary = {
  midfield: number;
  goalkeeping: number;
};

type CommentaryStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
};

type CommentaryEvent = {
  type:
    | 'goal'
    | 'chance'
    | 'save'
    | 'pressure'
    | 'shot'
    | 'counter'
    | 'cross'
    | 'block';
  text?: string;
};

function sample<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function getRecentTexts(recentEvents: CommentaryEvent[] | undefined) {
  return new Set(
    (recentEvents ?? [])
      .slice(-4)
      .map((event) => event.text)
      .filter((text): text is string => Boolean(text)),
  );
}

function pickVariant(options: string[], recentEvents?: CommentaryEvent[]) {
  const recentTexts = getRecentTexts(recentEvents);
  const freshOptions = options.filter((option) => !recentTexts.has(option));
  return sample(freshOptions.length > 0 ? freshOptions : options);
}

function getTeamName(team: CommentaryTeam) {
  return team === 'user' ? 'Ton équipe' : "L'équipe adverse";
}

function getMomentumTone(minute: number, attackingScore: number, defendingScore: number) {
  if (minute >= 80 && attackingScore < defendingScore) {
    return 'late-chase';
  }

  if (minute >= 70 && attackingScore === defendingScore) {
    return 'late-balance';
  }

  if (attackingScore > defendingScore) {
    return 'control';
  }

  return 'neutral';
}

export function buildHighlights(
  userSummary: CommentarySummary,
  aiSummary: CommentarySummary,
  userScore: number,
  aiScore: number,
  events: CommentaryEvent[],
) {
  const highlights: string[] = [];
  const goalCount = events.filter((event) => event.type === 'goal').length;
  const saves = events.filter((event) => event.type === 'save').length;
  const counters = events.filter((event) => event.type === 'counter').length;

  if (userSummary.midfield > aiSummary.midfield + 4) {
    highlights.push('Ton équipe a souvent pris le dessus dans l’entrejeu.');
  } else if (aiSummary.midfield > userSummary.midfield + 4) {
    highlights.push("L'équipe adverse a mieux contrôlé le rythme du match.");
  }

  if (userSummary.goalkeeping > aiSummary.goalkeeping + 4) {
    highlights.push('Ton gardien a pesé dans les moments chauds.');
  } else if (aiSummary.goalkeeping > userSummary.goalkeeping + 4) {
    highlights.push('Le gardien adverse a longtemps gardé son équipe en vie.');
  }

  if (goalCount <= 1) {
    highlights.push('Le match a laissé peu d’espaces et s’est joué sur des détails.');
  } else if (counters >= 3) {
    highlights.push('Le match a basculé plusieurs fois sur des transitions rapides.');
  } else if (saves >= 3) {
    highlights.push('Les gardiens ont souvent retardé l’ouverture du score.');
  }

  if (userScore === aiScore) {
    highlights.push('Personne n’a vraiment réussi à faire craquer l’autre jusqu’au bout.');
  } else if (Math.abs(userScore - aiScore) >= 2) {
    highlights.push('L’écart final reflète une domination assez nette.');
  } else {
    highlights.push('Un seul enchaînement a fini par faire la différence.');
  }

  return highlights;
}

export function buildHalfTimeSummary(args: {
  userScore: number;
  aiScore: number;
  userStats: CommentaryStats;
  aiStats: CommentaryStats;
  userSummary: CommentarySummary;
  aiSummary: CommentarySummary;
}) {
  const { userScore, aiScore, userStats, aiStats, userSummary, aiSummary } = args;
  const lines: string[] = [];

  if (userScore === aiScore) {
    if (userScore === 0) {
      lines.push('Mi-temps sans but pour le moment, avec un match encore assez fermé.');
    } else {
      lines.push(`Mi-temps sur le score de ${userScore}-${aiScore}, rien n’est encore joué.`);
    }
  } else if (userScore > aiScore) {
    lines.push(`Ton équipe vire en tête à la pause (${userScore}-${aiScore}).`);
  } else {
    lines.push(`L'équipe adverse mène à la pause (${aiScore}-${userScore}).`);
  }

  if (userStats.shots === aiStats.shots && Math.abs(userStats.possession - aiStats.possession) <= 4) {
    lines.push('La première période est restée très équilibrée dans le jeu comme dans les occasions.');
  } else if (userStats.shots + userStats.shotsOnTarget + userStats.xg >
      aiStats.shots + aiStats.shotsOnTarget + aiStats.xg) {
    lines.push('Ton équipe a semblé la plus dangereuse dans cette première période.');
  } else if (aiStats.shots + aiStats.shotsOnTarget + aiStats.xg >
      userStats.shots + userStats.shotsOnTarget + userStats.xg) {
    lines.push("L'équipe adverse a généré les situations les plus dangereuses avant la pause.");
  } else if (userSummary.midfield > aiSummary.midfield + 4) {
    lines.push('Ton équipe a plutôt eu la main sur le milieu jusque-là.');
  } else if (aiSummary.midfield > userSummary.midfield + 4) {
    lines.push("L'équipe adverse a mieux contrôlé l'entrejeu jusque-là.");
  }

  return lines.slice(0, 2);
}

export function buildFullTimeSummary(args: {
  userScore: number;
  aiScore: number;
  userStats: CommentaryStats;
  aiStats: CommentaryStats;
  highlights: string[];
}) {
  const { userScore, aiScore, userStats, aiStats, highlights } = args;
  const lines: string[] = [];

  if (userScore === aiScore) {
    lines.push(`Le match se termine sur un score de parité (${userScore}-${aiScore}).`);
  } else if (userScore > aiScore) {
    lines.push(`Ton équipe l'emporte ${userScore}-${aiScore} au terme d'un match bien disputé.`);
  } else {
    lines.push(`L'équipe adverse s'impose ${aiScore}-${userScore} au coup de sifflet final.`);
  }

  if (Math.abs(userStats.xg - aiStats.xg) >= 0.5) {
    if (userStats.xg > aiStats.xg) {
      lines.push('Ton équipe a fini par produire les occasions les plus nettes sur l’ensemble du match.');
    } else {
      lines.push("L'équipe adverse a globalement été la plus tranchante dans les zones décisives.");
    }
  } else if (highlights[0]) {
    lines.push(highlights[0]);
  }

  return lines.slice(0, 2);
}

export function buildPressureText(
  minute: number,
  team: CommentaryTeam,
  attackingScore: number,
  defendingScore: number,
  recentEvents?: CommentaryEvent[],
) {
  const teamName = getTeamName(team);
  const tone = getMomentumTone(minute, attackingScore, defendingScore);

  if (tone === 'late-chase') {
    return pickVariant(
      [
        `${teamName} pousse fort dans cette fin de match.`,
        `${teamName} insiste de plus en plus près de la surface.`,
        `${teamName} met beaucoup de pression pour revenir.`,
      ],
      recentEvents,
    );
  }

  if (tone === 'control') {
    return pickVariant(
      [
        `${teamName} fait tourner et garde le contrôle du tempo.`,
        `${teamName} conserve calmement le ballon pour faire reculer le bloc adverse.`,
        `${teamName} étire la défense et installe sa possession.`,
      ],
      recentEvents,
    );
  }

  if (minute <= 20) {
    return pickVariant(
      [
        `${teamName} cherche d’abord à poser le jeu.`,
        `${teamName} enchaîne plusieurs passes pour s’installer.`,
        `${teamName} prend son temps pour construire.`,
      ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      `${teamName} monopolise le ballon pendant plusieurs secondes.`,
      `${teamName} maintient la pression dans le camp adverse.`,
      `${teamName} fait circuler avec patience et gagne du terrain.`,
      `${teamName} reste installé haut et cherche l’ouverture.`,
    ],
    recentEvents,
  );
}

export function buildCounterText(
  team: CommentaryTeam,
  minute: number,
  recentEvents?: CommentaryEvent[],
) {
  const teamName = getTeamName(team);

  if (minute >= 75) {
    return pickVariant(
      [
        `${teamName} se projette très vite à la récupération.`,
        `${teamName} saute immédiatement vers l’avant en transition.`,
        `${teamName} exploite l’espace laissé dans le dos de la défense.`,
      ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      `${teamName} part vite en transition.`,
      `${teamName} jaillit en contre dès la récupération.`,
      `${teamName} accélère d’un coup et casse les lignes.`,
      `${teamName} se retourne rapidement vers le but adverse.`,
    ],
    recentEvents,
  );
}

export function buildCrossText(
  team: CommentaryTeam,
  creator?: string,
  recentEvents?: CommentaryEvent[],
) {
  const teamName = getTeamName(team);

  const options = creator
    ? [
        `${creator} trouve de l’espace sur le côté et centre fort devant le but.`,
        `${creator} déborde sur l’aile et adresse un ballon dangereux dans la surface.`,
        `${creator} prend le couloir et cherche un partenaire au second poteau.`,
      ]
    : [
        `${teamName} fait la différence sur le côté et centre dans la surface.`,
        `${teamName} passe par l’aile pour amener du danger devant le but.`,
        `${teamName} trouve un décalage sur le couloir et cherche la surface.`,
      ];

  return pickVariant(options, recentEvents);
}

export function buildBlockText(
  team: CommentaryTeam,
  recentEvents?: CommentaryEvent[],
  attackMode: AttackMode = 'central',
) {
  if (team === 'user') {
    if (attackMode === 'wide') {
      return pickVariant(
        [
          "La défense adverse coupe le centre avant qu'il n'arrive au second poteau.",
          'Le ballon venu du côté est repoussé au dernier moment.',
          "La défense adverse ferme bien la trajectoire dans la surface.",
        ],
        recentEvents,
      );
    }

    return pickVariant(
      [
        'La défense adverse contre la tentative au dernier moment.',
        'Un défenseur adverse se jette et dévie la frappe.',
        "Le tir de ton équipe est freiné par un retour défensif.",
        "L'action de ton équipe se termine dans un mur de jambes.",
      ],
      recentEvents,
    );
  }

  if (attackMode === 'wide') {
    return pickVariant(
      [
        'Ta défense coupe le centre juste avant le point de penalty.',
        'Le ballon venu du côté est bien repoussé par ton bloc.',
        'Ton équipe ferme l’axe au moment du centre adverse.',
      ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      'Ta défense revient de justesse pour contrer la frappe.',
      'Un défenseur de ton équipe bloque la tentative adverse.',
      'Ton bloc défensif ferme la porte au dernier instant.',
      "L'équipe adverse trouve l'axe, mais ta défense s'en sort.",
    ],
    recentEvents,
  );
}

export function buildChanceText(
  team: CommentaryTeam,
  quality: number,
  minute: number,
  recentEvents?: CommentaryEvent[],
  attackMode: AttackMode = 'central',
  creator?: string,
) {
  const teamName = getTeamName(team);
  const strongChance = quality >= 78;

  if (attackMode === 'transition') {
    const options = strongChance
      ? [
          `${teamName} prend la défense de vitesse et se crée une énorme situation.`,
          `${teamName} profite du déséquilibre et file vers une balle de but.`,
          `${teamName} transperce le bloc adverse en transition et se retrouve en très bonne position.`,
        ]
      : [
          `${teamName} se projette vite et trouve une vraie situation de frappe.`,
          `${teamName} remonte rapidement le terrain et menace dans les derniers mètres.`,
          `${teamName} attaque l’espace et se procure une occasion intéressante.`,
        ];

    return pickVariant(options, recentEvents);
  }

  if (attackMode === 'wide') {
    const options = creator
      ? [
          `${creator} apporte le danger depuis le côté et trouve une bonne zone dans la surface.`,
          `${creator} fait la différence sur l’aile et met son équipe en position de conclure.`,
          `${creator} crée le décalage qui ouvre enfin la défense.`,
        ]
      : [
          `${teamName} fait la différence sur l’aile et amène du danger dans la surface.`,
          `${teamName} ouvre bien le jeu et trouve une position intéressante.`,
          `${teamName} crée le décalage côté extérieur et devient menaçant.`,
        ];

    return pickVariant(options, recentEvents);
  }

  if (strongChance) {
    return pickVariant(
      [
        `${teamName} ouvre complètement la défense et se crée une grosse occasion.`,
        `${teamName} trouve enfin l’espace entre les lignes et se procure une balle de but.`,
        `${teamName} combine dans l’axe et arrive en très bonne position.`,
      ],
      recentEvents,
    );
  }

  if (minute >= 70) {
    return pickVariant(
      [
        `${teamName} force un peu plus le destin dans les trente derniers mètres.`,
        `${teamName} trouve une ouverture intéressante au bon moment.`,
        `${teamName} parvient enfin à casser une ligne dans l’axe.`,
      ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      `${teamName} trouve une ouverture intéressante.`,
      `${teamName} combine bien et approche de la surface.`,
      `${teamName} accélère au bon moment et crée le danger.`,
      `${teamName} se rapproche du but avec une séquence bien construite.`,
    ],
    recentEvents,
  );
}

export function buildSaveText(
  team: CommentaryTeam,
  quality: number,
  recentEvents?: CommentaryEvent[],
  scorer?: string,
) {
  if (team === 'user') {
    if (quality >= 0.3) {
      return pickVariant(
        scorer
          ? [
              `Le gardien adverse sort une grosse parade devant ${scorer}.`,
              `Le gardien adverse gagne son duel face à ${scorer}.`,
              `La frappe de ${scorer} est repoussée par un arrêt décisif.`,
            ]
          : [
              'Le gardien adverse réalise une parade décisive.',
              'Le gardien adverse détourne une frappe très dangereuse.',
              "Le gardien adverse s'interpose sur une grosse occasion.",
            ],
        recentEvents,
      );
    }

    return pickVariant(
      [
        'Le gardien adverse se couche bien sur le ballon.',
        'Le gardien adverse lit bien la tentative et intervient proprement.',
        "Le gardien adverse s'interpose sans trembler.",
      ],
      recentEvents,
    );
  }

  if (quality >= 0.3) {
    return pickVariant(
      scorer
        ? [
            `Ton gardien sort un arrêt décisif devant ${scorer}.`,
            `Ton gardien gagne son duel face à ${scorer}.`,
            `La frappe de ${scorer} est stoppée par une belle parade.`,
          ]
        : [
            'Ton gardien sort un arrêt capital.',
            'Ton gardien réalise une vraie parade réflexe.',
            'Ton gardien sauve ton équipe sur cette frappe.',
          ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      'Ton gardien intervient proprement.',
      'Ton gardien se place bien et capte le ballon.',
      'Ton gardien s’interpose sans laisser de seconde chance.',
    ],
    recentEvents,
  );
}

export function buildShotText(
  team: CommentaryTeam,
  quality: number,
  recentEvents?: CommentaryEvent[],
  attackMode: AttackMode = 'central',
  scorer?: string,
) {
  const subject = scorer ?? getTeamName(team);
  const isUser = team === 'user';

  if (attackMode === 'wide') {
    return pickVariant(
      isUser
        ? [
            `${subject} coupe mal le ballon et ça file à côté.`,
            `La reprise après le centre ne trouve pas le cadre.`,
            `${subject} manque la finition au terme de l’action côté.`,
          ]
        : [
            `La reprise adverse après le centre ne trouve pas le cadre.`,
            `${subject} ne parvient pas à ajuster sa finition sur ce ballon venu du côté.`,
            `L'équipe adverse termine l’action côté sans cadrer.`,
          ],
      recentEvents,
    );
  }

  if (quality >= 0.3) {
    return pickVariant(
      isUser
        ? [
            `${subject} manque le cadre de très peu.`,
            `${subject} passe tout près de faire la différence.`,
            `La tentative de ${subject} fuit le cadre pour quelques centimètres.`,
          ]
        : [
            `${subject} passe tout près du but.`,
            `La tentative adverse fuit le cadre d’un rien.`,
            `${subject} manque une très belle situation.`,
          ],
      recentEvents,
    );
  }

  return pickVariant(
    isUser
      ? [
          `${subject} tente sa chance, sans accrocher le cadre.`,
          `La frappe de ${subject} s’envole au-dessus.`,
          `${subject} essaye de loin, mais ça ne trouve pas la cible.`,
        ]
      : [
          `${subject} tente sa chance, sans réussite.`,
          `La frappe adverse ne trouve pas le cadre.`,
          `${subject} essaye de loin, mais ça s’échappe.`,
        ],
    recentEvents,
  );
}

export function buildGoalText(
  team: CommentaryTeam,
  scorer: string,
  minute: number,
  quality: number,
  assister?: string,
  recentEvents?: CommentaryEvent[],
  attackMode: AttackMode = 'central',
) {
  const assistedSuffix = assister ? ` après un service de ${assister}` : '';

  if (attackMode === 'transition') {
    return pickVariant(
      team === 'user'
        ? [
            `${scorer} conclut parfaitement la transition${assistedSuffix}.`,
            `${scorer} finit le contre avec beaucoup de sang-froid${assistedSuffix}.`,
            `${scorer} punit la défense adverse en pleine transition${assistedSuffix}.`,
          ]
        : [
            `${scorer} conclut parfaitement la transition adverse${assistedSuffix}.`,
            `${scorer} termine le contre de l’équipe adverse${assistedSuffix}.`,
            `${scorer} te punit après une transition très rapide${assistedSuffix}.`,
          ],
      recentEvents,
    );
  }

  if (attackMode === 'wide') {
    return pickVariant(
      team === 'user'
        ? [
            `${scorer} reprend bien le ballon venu du côté${assistedSuffix}.`,
            `${scorer} convertit l’action amenée depuis l’aile${assistedSuffix}.`,
            `${scorer} conclut au second poteau${assistedSuffix}.`,
          ]
        : [
            `${scorer} reprend bien le ballon venu du côté${assistedSuffix}.`,
            `${scorer} conclut l’action adverse après un décalage sur l’aile${assistedSuffix}.`,
            `${scorer} surgit dans la surface pour l’équipe adverse${assistedSuffix}.`,
          ],
      recentEvents,
    );
  }

  if (minute >= 75) {
    return pickVariant(
      team === 'user'
        ? [
            `${scorer} frappe au meilleur moment${assistedSuffix}.`,
            `${scorer} fait basculer cette fin de match${assistedSuffix}.`,
            `${scorer} surgit quand le match se tend${assistedSuffix}.`,
          ]
        : [
            `${scorer} frappe très tard pour l’équipe adverse${assistedSuffix}.`,
            `${scorer} fait basculer la fin de match${assistedSuffix}.`,
            `${scorer} punit ta défense dans les derniers instants${assistedSuffix}.`,
          ],
      recentEvents,
    );
  }

  if (quality >= 0.35) {
    return pickVariant(
      team === 'user'
        ? [
            `${scorer} conclut une très belle action${assistedSuffix}.`,
            `${scorer} transforme cette grosse occasion${assistedSuffix}.`,
            `${scorer} sanctionne la défense adverse avec beaucoup de calme${assistedSuffix}.`,
          ]
        : [
            `${scorer} conclut une action dangereuse pour l’équipe adverse${assistedSuffix}.`,
            `${scorer} transforme cette grosse occasion adverse${assistedSuffix}.`,
            `${scorer} profite de l’ouverture laissée par ta défense${assistedSuffix}.`,
          ],
      recentEvents,
    );
  }

  return pickVariant(
    team === 'user'
      ? [
          `${scorer} trouve l’ouverture pour ton équipe${assistedSuffix}.`,
          `${scorer} pousse le ballon au fond${assistedSuffix}.`,
          `${scorer} termine l’action avec efficacité${assistedSuffix}.`,
        ]
      : [
          `${scorer} trouve l’ouverture pour l’équipe adverse${assistedSuffix}.`,
          `${scorer} fait mouche pour l’équipe adverse${assistedSuffix}.`,
          `${scorer} termine l’action adverse avec efficacité${assistedSuffix}.`,
        ],
    recentEvents,
  );
}
