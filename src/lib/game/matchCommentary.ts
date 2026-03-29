type CommentaryTeam = 'user' | 'ai';

type CommentarySummary = {
  midfield: number;
  goalkeeping: number;
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
};

function sample<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function pickText(options: string[]) {
  return sample(options);
}

function getTeamName(team: CommentaryTeam) {
  return team === 'user' ? 'Ton équipe' : "L'équipe adverse";
}

export function buildHighlights(
  userSummary: CommentarySummary,
  aiSummary: CommentarySummary,
  userScore: number,
  aiScore: number,
  events: CommentaryEvent[],
) {
  const highlights: string[] = [];

  if (userSummary.midfield > aiSummary.midfield + 4) {
    highlights.push('Ton milieu a imposé le rythme du match.');
  } else if (aiSummary.midfield > userSummary.midfield + 4) {
    highlights.push("L'équipe adverse a mieux contrôlé la circulation du ballon.");
  }

  if (userSummary.goalkeeping > aiSummary.goalkeeping + 4) {
    highlights.push('Ton gardien a apporté une vraie sécurité.');
  } else if (aiSummary.goalkeeping > userSummary.goalkeeping + 4) {
    highlights.push("Le gardien adverse a souvent repoussé les situations chaudes.");
  }

  if (events.filter((event) => event.type === 'goal').length <= 1) {
    highlights.push('Le match a surtout été tactique, avec peu d’espaces.');
  }

  if (userScore === aiScore) {
    highlights.push('Le score est resté indécis jusqu’au bout.');
  } else if (Math.abs(userScore - aiScore) >= 2) {
    highlights.push("L'écart final traduit une domination assez nette.");
  } else {
    highlights.push('Le match s’est joué sur des détails.');
  }

  return highlights;
}

export function buildPressureText(
  minute: number,
  team: CommentaryTeam,
  attackingScore: number,
  defendingScore: number,
) {
  const chasing = attackingScore < defendingScore;

  if (team === 'user') {
    if (minute >= 75 && chasing) {
      return pickText([
        'Ton équipe pousse fort dans les dernières minutes.',
        'Ton équipe jette ses forces vers l’avant pour revenir.',
        'La pression monte, ton équipe insiste dans le camp adverse.',
      ]);
    }

    return pickText([
      'Ton équipe installe une longue phase de possession.',
      'Ton équipe fait circuler le ballon avec patience.',
      'Ton équipe confisque le ballon pendant plusieurs secondes.',
      'Ton équipe s’installe haut et fait reculer le bloc adverse.',
    ]);
  }

  if (minute >= 75 && chasing) {
    return pickText([
      "L'équipe adverse pousse fort dans les dernières minutes.",
      "L'équipe adverse augmente la pression pour revenir au score.",
      "L'équipe adverse s'installe dans ton camp et insiste.",
    ]);
  }

  return pickText([
    "L'équipe adverse monopolise le ballon pendant plusieurs secondes.",
    "L'équipe adverse fait tourner et cherche la faille.",
    "L'équipe adverse impose un temps fort dans ton camp.",
    "L'équipe adverse fait reculer ton bloc avec une longue séquence.",
  ]);
}

export function buildCounterText(team: CommentaryTeam, minute: number) {
  const teamName = getTeamName(team);

  if (minute >= 70) {
    return pickText([
      `${teamName} part en contre à pleine vitesse.`,
      `${teamName} se projette vite après la récupération.`,
      `${teamName} exploite l'espace laissé dans le dos de la défense.`,
    ]);
  }

  return pickText([
    `${teamName} lance une transition rapide.`,
    `${teamName} jaillit en contre et gagne du terrain.`,
    `${teamName} accélère d'un coup après la récupération.`,
  ]);
}

export function buildCrossText(team: CommentaryTeam) {
  const teamName = getTeamName(team);

  return pickText([
    `${teamName} fait la différence sur le côté et centre dans la surface.`,
    `${teamName} trouve un décalage sur l'aile et envoie le ballon devant le but.`,
    `${teamName} passe par les côtés pour apporter le danger dans la surface.`,
  ]);
}

export function buildBlockText(team: CommentaryTeam) {
  if (team === 'user') {
    return pickText([
      "La défense adverse contre la tentative au dernier moment.",
      "Un défenseur adverse se jette et détourne la frappe.",
      "Le tir de ton équipe est freiné par un retour défensif.",
    ]);
  }

  return pickText([
    'Ta défense revient de justesse pour contrer la frappe.',
    'Un défenseur de ton équipe bloque la tentative adverse.',
    "Ton bloc défensif ferme la porte au dernier instant.",
  ]);
}

export function buildChanceText(team: CommentaryTeam, quality: number, minute: number) {
  if (team === 'user') {
    if (quality >= 78) {
      return pickText([
        'Ton équipe construit une énorme occasion dans la surface.',
        'Ton équipe déchire le bloc adverse et se crée une balle de but.',
        'Ton équipe trouve un espace immense dans la surface.',
      ]);
    }

    if (minute >= 70) {
      return pickText([
        'Ton équipe accélère et se procure une situation intéressante.',
        'Ton équipe pousse et trouve enfin une vraie ouverture.',
        'Ton équipe se projette vite et menace dans les trente derniers mètres.',
      ]);
    }

    return pickText([
      'Ton équipe trouve une ouverture intéressante.',
      'Ton équipe parvient à casser une ligne et se montre dangereuse.',
      'Ton équipe combine bien et approche de la surface.',
      'Ton équipe accélère au bon moment et crée le danger.',
    ]);
  }

  if (quality >= 78) {
    return pickText([
      "L'équipe adverse se crée une situation très dangereuse.",
      "L'équipe adverse ouvre complètement ta défense.",
      "L'équipe adverse obtient une énorme occasion dans la surface.",
    ]);
  }

  if (minute >= 70) {
    return pickText([
      "L'équipe adverse pousse fort et trouve une vraie ouverture.",
      "L'équipe adverse accélère dans les derniers mètres.",
      "L'équipe adverse se projette vite et menace sérieusement.",
    ]);
  }

  return pickText([
    "L'équipe adverse trouve une ouverture intéressante.",
    "L'équipe adverse parvient à accélérer dans les trente derniers mètres.",
    "L'équipe adverse combine bien et approche dangereusement de la surface.",
    "L'équipe adverse trouve un décalage et se rapproche du but.",
  ]);
}

export function buildSaveText(team: CommentaryTeam, quality: number) {
  if (team === 'user') {
    return quality >= 0.3
      ? pickText([
          "Le gardien adverse réalise une parade décisive.",
          "Le gardien adverse détourne une frappe très dangereuse.",
          "Le gardien adverse s'interpose sur une grosse occasion.",
        ])
      : pickText([
          "Le gardien adverse capte sans trembler.",
          "Le gardien adverse repousse la tentative de ton équipe.",
          "Le gardien adverse ferme bien son angle.",
        ]);
  }

  return quality >= 0.3
    ? pickText([
        'Ton gardien sort un arrêt capital.',
        'Ton gardien réalise une vraie parade réflexe.',
        'Ton gardien sauve ton équipe sur cette frappe.',
      ])
    : pickText([
        'Ton gardien intervient proprement.',
        'Ton gardien s’interpose sans paniquer.',
        'Ton gardien lit bien la trajectoire et capte le ballon.',
      ]);
}

export function buildShotText(team: CommentaryTeam, quality: number) {
  if (team === 'user') {
    return quality >= 0.3
      ? pickText([
          'La frappe de ton équipe fuit le cadre de peu.',
          'Ton équipe passe tout près de l’ouverture du score.',
          'La tentative de ton équipe manque le cadre pour quelques centimètres.',
        ])
      : pickText([
          'La tentative de ton équipe passe à côté.',
          'Ton équipe tente sa chance, sans accrocher le cadre.',
          'La frappe de ton équipe s’envole au-dessus.',
        ]);
  }

  return quality >= 0.3
    ? pickText([
        "L'équipe adverse passe tout près du but.",
        "La tentative adverse fuit le cadre d’un rien.",
        "L'équipe adverse manque une belle situation.",
      ])
    : pickText([
        "La frappe de l'équipe adverse ne trouve pas le cadre.",
        "L'équipe adverse tente sa chance, sans réussite.",
        "La tentative adverse s'échappe largement.",
      ]);
}

export function buildGoalText(
  team: CommentaryTeam,
  scorer: string,
  minute: number,
  quality: number,
  assister?: string,
) {
  const assistedSuffix = assister ? ` après un service de ${assister}` : '';

  if (team === 'user') {
    if (minute >= 75) {
      return pickText([
        `${scorer} fait exploser le match en fin de rencontre${assistedSuffix}.`,
        `${scorer} surgit au meilleur moment pour ton équipe${assistedSuffix}.`,
        `${scorer} frappe au moment où le match se tend${assistedSuffix}.`,
      ]);
    }

    if (quality >= 0.35) {
      return pickText([
        `${scorer} conclut une très belle action pour ton équipe${assistedSuffix}.`,
        `${scorer} transforme cette grosse occasion pour ton équipe${assistedSuffix}.`,
        `${scorer} sanctionne la défense adverse avec beaucoup de sang-froid${assistedSuffix}.`,
      ]);
    }

    return pickText([
      `${scorer} conclut l’action pour ton équipe${assistedSuffix}.`,
      `${scorer} pousse le ballon au fond pour ton équipe${assistedSuffix}.`,
      `${scorer} trouve enfin l’ouverture pour ton équipe${assistedSuffix}.`,
    ]);
  }

  if (minute >= 75) {
    return pickText([
      `${scorer} frappe très tard pour l'équipe adverse${assistedSuffix}.`,
      `${scorer} punit ta défense dans les derniers instants${assistedSuffix}.`,
      `${scorer} fait basculer la fin de match pour l'équipe adverse${assistedSuffix}.`,
    ]);
  }

  if (quality >= 0.35) {
    return pickText([
      `${scorer} conclut une action dangereuse pour l'équipe adverse${assistedSuffix}.`,
      `${scorer} sanctionne ta défense sur cette grosse situation${assistedSuffix}.`,
      `${scorer} transforme cette occasion nette pour l'équipe adverse${assistedSuffix}.`,
    ]);
  }

  return pickText([
    `${scorer} trouve l’ouverture pour l'équipe adverse${assistedSuffix}.`,
    `${scorer} punit ta défense pour l'équipe adverse${assistedSuffix}.`,
    `${scorer} fait mouche pour l'équipe adverse${assistedSuffix}.`,
  ]);
}
