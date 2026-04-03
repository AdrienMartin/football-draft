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
    | 'block'
    | 'error'
    | 'aerial'
    | 'rebound';
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
  return team === 'user' ? 'Ton equipe' : "L'equipe adverse";
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
  const crosses = events.filter((event) => event.type === 'cross').length;
  const defensiveErrors = events.filter((event) => event.type === 'error').length;
  const rebounds = events.filter((event) => event.type === 'rebound').length;
  const aerials = events.filter((event) => event.type === 'aerial').length;

  if (userSummary.midfield > aiSummary.midfield + 4) {
    highlights.push("Ton equipe a souvent eu la main dans l'entrejeu.");
  } else if (aiSummary.midfield > userSummary.midfield + 4) {
    highlights.push("L'equipe adverse a mieux controle le tempo du match.");
  }

  if (userSummary.goalkeeping > aiSummary.goalkeeping + 4) {
    highlights.push('Ton gardien a eu un vrai poids dans les moments chauds.');
  } else if (aiSummary.goalkeeping > userSummary.goalkeeping + 4) {
    highlights.push("Le gardien adverse a longtemps garde son equipe dans le match.");
  }

  if (goalCount <= 1) {
    highlights.push("Le match a laisse peu d'espaces et s'est joue sur des details.");
  } else if (counters >= 3) {
    highlights.push('Le match a souvent bascule sur des transitions rapides.');
  } else if (crosses >= 3) {
    highlights.push('Les couloirs ont beaucoup compte dans la construction des occasions.');
  } else if (aerials >= 3) {
    highlights.push('Plusieurs situations se sont decidees dans les duels aeriens.');
  } else if (rebounds >= 2) {
    highlights.push('Les seconds ballons ont amene plusieurs sequences de danger.');
  } else if (defensiveErrors >= 2) {
    highlights.push('Quelques erreurs defensives ont ouvert des opportunites inhabituelles.');
  } else if (saves >= 3) {
    highlights.push('Les gardiens ont repousse plusieurs situations importantes.');
  }

  if (userScore === aiScore) {
    highlights.push("Aucune equipe n'a vraiment reussi a faire craquer l'autre jusqu'au bout.");
  } else if (Math.abs(userScore - aiScore) >= 2) {
    highlights.push("L'ecart final raconte une domination assez nette.");
  } else {
    highlights.push('Un seul enchainement a fini par faire la difference.');
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
      lines.push('Mi-temps sans but pour le moment, avec un match encore assez ferme.');
    } else {
      lines.push(`Mi-temps sur le score de ${userScore}-${aiScore}, tout reste ouvert.`);
    }
  } else if (userScore > aiScore) {
    lines.push(`Ton equipe vire en tete a la pause (${userScore}-${aiScore}).`);
  } else {
    lines.push(`L'equipe adverse mene a la pause (${aiScore}-${userScore}).`);
  }

  const userDanger = userStats.shots + userStats.shotsOnTarget + userStats.xg;
  const aiDanger = aiStats.shots + aiStats.shotsOnTarget + aiStats.xg;

  if (Math.abs(userStats.possession - aiStats.possession) <= 4 && Math.abs(userDanger - aiDanger) <= 1.2) {
    lines.push('La premiere periode est restee tres equilibree dans le jeu comme dans les occasions.');
  } else if (userDanger > aiDanger + 1) {
    lines.push('Ton equipe a semble la plus dangereuse avant la pause.');
  } else if (aiDanger > userDanger + 1) {
    lines.push("L'equipe adverse a genere les situations les plus nettes avant la pause.");
  } else if (userSummary.midfield > aiSummary.midfield + 4) {
    lines.push("Ton equipe a plutot controle le milieu jusque-la.");
  } else if (aiSummary.midfield > userSummary.midfield + 4) {
    lines.push("L'equipe adverse a mieux tenu l'entrejeu jusque-la.");
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
    lines.push(`Le match se termine sur un score de parite (${userScore}-${aiScore}).`);
  } else if (userScore > aiScore) {
    lines.push(`Ton equipe l'emporte ${userScore}-${aiScore} au terme d'un match bien dispute.`);
  } else {
    lines.push(`L'equipe adverse s'impose ${aiScore}-${userScore} au coup de sifflet final.`);
  }

  if (Math.abs(userStats.xg - aiStats.xg) >= 0.5) {
    if (userStats.xg > aiStats.xg) {
      lines.push("Ton equipe a fini par produire les occasions les plus nettes sur l'ensemble du match.");
    } else {
      lines.push("L'equipe adverse a ete la plus tranchante dans les zones decisives.");
    }
  } else if (Math.abs(userStats.shotsOnTarget - aiStats.shotsOnTarget) >= 2) {
    if (userStats.shotsOnTarget > aiStats.shotsOnTarget) {
      lines.push('Ton equipe a cadre davantage et a mieux fini ses actions.');
    } else {
      lines.push("L'equipe adverse a plus souvent trouve le cadre et t'a mis sous pression.");
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
        `${teamName} insiste de plus en plus pres de la surface.`,
        `${teamName} met beaucoup de pression pour revenir.`,
        `${teamName} hausse clairement le rythme pour arracher quelque chose.`,
      ],
      recentEvents,
    );
  }

  if (tone === 'control') {
    return pickVariant(
      [
        `${teamName} fait tourner et garde le controle du tempo.`,
        `${teamName} conserve calmement le ballon pour faire reculer le bloc adverse.`,
        `${teamName} etire la defense et installe sa possession.`,
      ],
      recentEvents,
    );
  }

  if (minute <= 20) {
    return pickVariant(
      [
        `${teamName} cherche d'abord a poser le jeu.`,
        `${teamName} enchaine plusieurs passes pour s'installer.`,
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
      `${teamName} reste haut et cherche l'ouverture.`,
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
        `${teamName} se projette tres vite a la recuperation.`,
        `${teamName} saute immediatement vers l'avant en transition.`,
        `${teamName} exploite l'espace laisse dans le dos de la defense.`,
      ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      `${teamName} part vite en transition.`,
      `${teamName} jaillit en contre des la recuperation.`,
      `${teamName} accelere d'un coup et casse les lignes.`,
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
        `${creator} trouve de l'espace sur le cote et centre fort devant le but.`,
        `${creator} deborde sur l'aile et adresse un ballon dangereux dans la surface.`,
        `${creator} prend le couloir et cherche un partenaire au second poteau.`,
        `${creator} leve la tete et envoie un centre tendu dans la zone de verite.`,
      ]
    : [
        `${teamName} fait la difference sur le cote et centre dans la surface.`,
        `${teamName} passe par l'aile pour amener du danger devant le but.`,
        `${teamName} trouve un decalage sur le couloir et cherche la surface.`,
        `${teamName} etire bien le bloc adverse et amene un ballon dangereux devant le but.`,
      ];

  return pickVariant(options, recentEvents);
}

export function buildErrorText(
  team: CommentaryTeam,
  recentEvents?: CommentaryEvent[],
  instigator?: string,
) {
  const teamName = getTeamName(team);

  const options = instigator
    ? [
        `${instigator} profite d'une mauvaise relance et accelere aussitot.`,
        `${instigator} sent bien l'erreur defensive et s'engouffre dans l'espace.`,
        `${instigator} recupere un ballon mal negocie et peut se projeter.`,
      ]
    : [
        `${teamName} profite d'une grosse approximation defensive.`,
        `${teamName} recupere un ballon donne pres de la zone dangereuse.`,
        `${teamName} beneficie d'une relance ratee et se remet a attaquer.`,
      ];

  return pickVariant(options, recentEvents);
}

export function buildAerialText(
  team: CommentaryTeam,
  recentEvents?: CommentaryEvent[],
  target?: string,
) {
  const teamName = getTeamName(team);

  const options = target
    ? [
        `${target} attaque bien le ballon dans les airs.`,
        `${target} se presente au duel aerien dans la surface.`,
        `${target} vient disputer ce ballon haut au coeur de la surface.`,
      ]
    : [
        `${teamName} cherche la solution dans les airs au coeur de la surface.`,
        `${teamName} mise sur un duel aerien pour faire la difference.`,
        `${teamName} amene un ballon haut dans une zone tres dangereuse.`,
      ];

  return pickVariant(options, recentEvents);
}

export function buildReboundText(
  team: CommentaryTeam,
  recentEvents?: CommentaryEvent[],
  scorer?: string,
) {
  const teamName = getTeamName(team);

  const options = scorer
    ? [
        `${scorer} suit bien et se jette sur le second ballon.`,
        `${scorer} est le premier sur le ballon relache.`,
        `${scorer} anticipe parfaitement le rebond dans la surface.`,
      ]
    : [
        `${teamName} reste vivant sur le second ballon.`,
        `${teamName} recupere le ballon relache dans une zone chaude.`,
        `${teamName} est le plus prompt apres ce ballon qui traine.`,
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
          "La defense adverse coupe le centre avant qu'il n'arrive au second poteau.",
          'Le ballon venu du cote est repousse au dernier moment.',
          'La defense adverse ferme bien la trajectoire dans la surface.',
        ],
        recentEvents,
      );
    }

    return pickVariant(
      [
        'La defense adverse contre la tentative au dernier moment.',
        'Un defenseur adverse se jette et devie la frappe.',
        "Le tir de ton equipe est freine par un retour defensif.",
        "L'action de ton equipe se termine dans un mur de jambes.",
      ],
      recentEvents,
    );
  }

  if (attackMode === 'wide') {
    return pickVariant(
      [
        'Ta defense coupe le centre juste avant le point de penalty.',
        'Le ballon venu du cote est bien repousse par ton bloc.',
        "Ton equipe ferme l'axe au moment du centre adverse.",
      ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      'Ta defense revient de justesse pour contrer la frappe.',
      'Un defenseur de ton equipe bloque la tentative adverse.',
      'Ton bloc defensif ferme la porte au dernier instant.',
      "L'equipe adverse trouve l'axe, mais ta defense s'en sort.",
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
          `${teamName} prend la defense de vitesse et se cree une enorme situation.`,
          `${teamName} profite du desequilibre et file vers une balle de but.`,
          `${teamName} transperce le bloc adverse en transition et se retrouve en tres bonne position.`,
        ]
      : [
          `${teamName} se projette vite et trouve une vraie situation de frappe.`,
          `${teamName} remonte rapidement le terrain et menace dans les derniers metres.`,
          `${teamName} attaque l'espace et se procure une occasion interessante.`,
        ];

    return pickVariant(options, recentEvents);
  }

  if (attackMode === 'wide') {
    const options = creator
      ? [
          `${creator} apporte le danger depuis le cote et trouve une bonne zone dans la surface.`,
          `${creator} fait la difference sur l'aile et met son equipe en position de conclure.`,
          `${creator} cree le decalage qui ouvre enfin la defense.`,
          `${creator} accelere sur le couloir et met la defense sous tension.`,
        ]
      : [
          `${teamName} fait la difference sur l'aile et amene du danger dans la surface.`,
          `${teamName} ouvre bien le jeu et trouve une position interessante.`,
          `${teamName} cree le decalage cote exterieur et devient menacant.`,
        ];

    return pickVariant(options, recentEvents);
  }

  if (strongChance) {
    return pickVariant(
      [
        `${teamName} ouvre completement la defense et se cree une grosse occasion.`,
        `${teamName} trouve enfin l'espace entre les lignes et se procure une balle de but.`,
        `${teamName} combine dans l'axe et arrive en tres bonne position.`,
      ],
      recentEvents,
    );
  }

  if (minute >= 70) {
    return pickVariant(
      [
        `${teamName} force un peu plus le destin dans les trente derniers metres.`,
        `${teamName} trouve une ouverture interessante au bon moment.`,
        `${teamName} parvient enfin a casser une ligne dans l'axe.`,
      ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      `${teamName} trouve une ouverture interessante.`,
      `${teamName} combine bien et approche de la surface.`,
      `${teamName} accelere au bon moment et cree le danger.`,
      `${teamName} se rapproche du but avec une sequence bien construite.`,
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
              `Le gardien adverse gagne son duel face a ${scorer}.`,
              `La frappe de ${scorer} est repoussee par un arret decisif.`,
              `Le gardien adverse se detend parfaitement sur la tentative de ${scorer}.`,
            ]
          : [
              'Le gardien adverse realise une parade decisive.',
              'Le gardien adverse detourne une frappe tres dangereuse.',
              "Le gardien adverse s'interpose sur une grosse occasion.",
              "Le gardien adverse ferme bien son angle et repousse le danger.",
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
            `Ton gardien sort un arret decisif devant ${scorer}.`,
            `Ton gardien gagne son duel face a ${scorer}.`,
            `La frappe de ${scorer} est stoppee par une belle parade.`,
            `Ton gardien se detend bien et sort la tentative de ${scorer}.`,
          ]
        : [
            'Ton gardien sort un arret capital.',
            'Ton gardien realise une vraie parade reflexe.',
            'Ton gardien sauve ton equipe sur cette frappe.',
            'Ton gardien ferme bien son angle et repousse le danger.',
          ],
      recentEvents,
    );
  }

  return pickVariant(
    [
      'Ton gardien intervient proprement.',
      'Ton gardien se place bien et capte le ballon.',
      'Ton gardien s interpose sans laisser de seconde chance.',
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
            `${subject} coupe mal le ballon et ca file a cote.`,
            'La reprise apres le centre ne trouve pas le cadre.',
            `${subject} manque la finition au terme de l'action cote.`,
            `${subject} est un peu en retard sur ce centre et ne peut pas ajuster.`,
          ]
        : [
            "La reprise adverse apres le centre ne trouve pas le cadre.",
            `${subject} ne parvient pas a ajuster sa finition sur ce ballon venu du cote.`,
            "L'equipe adverse termine l'action cote sans cadrer.",
            `${subject} est gene au moment de couper ce ballon venu du couloir.`,
          ],
      recentEvents,
    );
  }

  if (quality >= 0.3) {
    return pickVariant(
      isUser
        ? [
            `${subject} manque le cadre de tres peu.`,
            `${subject} passe tout pres de faire la difference.`,
            `La tentative de ${subject} fuit le cadre pour quelques centimetres.`,
          ]
        : [
            `${subject} passe tout pres du but.`,
            "La tentative adverse fuit le cadre d'un rien.",
            `${subject} manque une tres belle situation.`,
          ],
      recentEvents,
    );
  }

  return pickVariant(
    isUser
      ? [
          `${subject} tente sa chance, sans accrocher le cadre.`,
          `La frappe de ${subject} s'envole au-dessus.`,
          `${subject} essaye de loin, mais ca ne trouve pas la cible.`,
        ]
      : [
          `${subject} tente sa chance, sans reussite.`,
          'La frappe adverse ne trouve pas le cadre.',
          `${subject} essaye de loin, mais ca s'echappe.`,
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
  const assistedSuffix = assister ? ` apres un service de ${assister}` : '';

  if (attackMode === 'transition') {
    return pickVariant(
      team === 'user'
        ? [
            `${scorer} conclut parfaitement la transition${assistedSuffix}.`,
            `${scorer} finit le contre avec beaucoup de sang-froid${assistedSuffix}.`,
            `${scorer} punit la defense adverse en pleine transition${assistedSuffix}.`,
          ]
        : [
            `${scorer} conclut parfaitement la transition adverse${assistedSuffix}.`,
            `${scorer} termine le contre de l'equipe adverse${assistedSuffix}.`,
            `${scorer} te punit apres une transition tres rapide${assistedSuffix}.`,
          ],
      recentEvents,
    );
  }

  if (attackMode === 'wide') {
    return pickVariant(
      team === 'user'
        ? [
            `${scorer} reprend bien le ballon venu du cote${assistedSuffix}.`,
            `${scorer} convertit l'action amenee depuis l'aile${assistedSuffix}.`,
            `${scorer} conclut au second poteau${assistedSuffix}.`,
            `${scorer} surgit dans la bonne zone sur ce ballon venu du couloir${assistedSuffix}.`,
          ]
        : [
            `${scorer} reprend bien le ballon venu du cote${assistedSuffix}.`,
            `${scorer} conclut l'action adverse apres un decalage sur l'aile${assistedSuffix}.`,
            `${scorer} surgit dans la surface pour l'equipe adverse${assistedSuffix}.`,
            `${scorer} profite du centre pour finir de pres${assistedSuffix}.`,
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
            `${scorer} tranche cette fin de match tendue${assistedSuffix}.`,
          ]
        : [
            `${scorer} frappe tres tard pour l'equipe adverse${assistedSuffix}.`,
            `${scorer} fait basculer la fin de match${assistedSuffix}.`,
            `${scorer} punit ta defense dans les derniers instants${assistedSuffix}.`,
            `${scorer} fait tres mal dans les toutes dernieres minutes${assistedSuffix}.`,
          ],
      recentEvents,
    );
  }

  if (quality >= 0.35) {
    return pickVariant(
      team === 'user'
        ? [
            `${scorer} conclut une tres belle action${assistedSuffix}.`,
            `${scorer} transforme cette grosse occasion${assistedSuffix}.`,
            `${scorer} sanctionne la defense adverse avec beaucoup de calme${assistedSuffix}.`,
          ]
        : [
            `${scorer} conclut une action dangereuse pour l'equipe adverse${assistedSuffix}.`,
            `${scorer} transforme cette grosse occasion adverse${assistedSuffix}.`,
            `${scorer} profite de l'ouverture laissee par ta defense${assistedSuffix}.`,
          ],
      recentEvents,
    );
  }

  return pickVariant(
    team === 'user'
      ? [
          `${scorer} trouve l'ouverture pour ton equipe${assistedSuffix}.`,
          `${scorer} pousse le ballon au fond${assistedSuffix}.`,
          `${scorer} termine l'action avec efficacite${assistedSuffix}.`,
        ]
      : [
          `${scorer} trouve l'ouverture pour l'equipe adverse${assistedSuffix}.`,
          `${scorer} fait mouche pour l'equipe adverse${assistedSuffix}.`,
          `${scorer} termine l'action adverse avec efficacite${assistedSuffix}.`,
        ],
    recentEvents,
  );
}
