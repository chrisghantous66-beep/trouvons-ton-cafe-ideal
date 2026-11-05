const FLOOR_SCORE = 3;
const FALLBACK_ID = 'decouverte';

export function selectArchetype(archetypes, quiz) {
  const scored = archetypes
    .filter(a => a.id !== FALLBACK_ID)
    .map(a => ({ archetype: a, score: scoreArchetype(a, quiz) }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aMandatory = mandatoryMatchCount(a.archetype, quiz);
    const bMandatory = mandatoryMatchCount(b.archetype, quiz);
    if (bMandatory !== aMandatory) return bMandatory - aMandatory;
    return a.archetype.id.localeCompare(b.archetype.id);
  });

  const winner = scored[0];
  if (!winner || winner.score < FLOOR_SCORE) {
    return archetypes.find(a => a.id === FALLBACK_ID);
  }
  return winner.archetype;
}

function mandatoryMatchCount(archetype, quiz) {
  let count = 0;
  if (archetype.match_tags.moment.includes(quiz.moment)) count++;
  if (archetype.match_tags.profil.includes(quiz.profil_gustatif)) count++;
  if (archetype.match_tags.intensity.includes(quiz.intensity)) count++;
  if (archetype.match_tags.roast?.includes(quiz.roast_level)) count++;
  return count;
}

export function scoreArchetype(archetype, quiz) {
  let score = 0;
  const tags = archetype.match_tags;

  // Axes obligatoires
  if (tags.moment.includes(quiz.moment)) score += 3;
  if (tags.profil.includes(quiz.profil_gustatif)) score += 3;
  if (tags.intensity.includes(quiz.intensity)) score += 2;
  if (tags.roast?.includes(quiz.roast_level)) score += 2;

  // Bonus optionnels (si réponses présentes ET tags définis sur archétype)
  if (quiz.notes_specifiques?.length && hasNoteOverlap(archetype, quiz.notes_specifiques)) {
    score += 1;
  }
  if (quiz.acidite_toleree && matchesAcidity(archetype, quiz.acidite_toleree)) {
    score += 1;
  }
  if (quiz.experience_level && matchesExperience(archetype, quiz.experience_level)) {
    score += 1;
  }

  return score;
}

function hasNoteOverlap(archetype, userNotes) {
  const profils = archetype.match_tags.profil;
  const choc = ['chocolat', 'caramel', 'noisette'];
  const fruit = ['agrumes', 'fruits secs', 'pêche', 'citron', 'fruits rouges'];
  const floral = ['floral', 'fleur'];

  const isChoc = profils.some(p => p.includes('chocolate'));
  const isFruite = profils.some(p => p.includes('fruite'));
  const isFloral = profils.some(p => p.includes('floral'));

  if (isChoc && userNotes.some(n => choc.includes(n))) return true;
  if (isFruite && userNotes.some(n => fruit.includes(n))) return true;
  if (isFloral && userNotes.some(n => floral.includes(n))) return true;
  return false;
}

function matchesAcidity(archetype, acidite) {
  const profils = archetype.match_tags.profil;
  const isChoc = profils.some(p => p.includes('chocolate'));
  const isFruite = profils.some(p => p.includes('fruite'));
  const isFloral = profils.some(p => p.includes('floral'));

  if (acidite === 'faible' && isChoc) return true;
  if (acidite === 'moyenne' && (isChoc || isFruite)) return true;
  if (acidite === 'haute' && (isFruite || isFloral)) return true;
  return false;
}

function matchesExperience(archetype, level) {
  const profils = archetype.match_tags.profil;
  if (level === 'connaisseur' && profils.includes('complexe-floral')) return true;
  if (level === 'amateur' && (profils.includes('gourmand-chocolate') || profils.includes('vif-fruite'))) return true;
  return false;
}

export function computeAlternatives(coffees, quiz, blendComposition) {
  const blendIds = blendComposition.map(c => c.coffee_id);

  const scored = coffees
    .filter(c => !blendIds.includes(c.id))
    .map(c => ({ coffee: c, score: scoreCoffeeAlt(c, quiz) }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 2).map(({ coffee }) => ({
    coffee,
    reason: buildAltReason(coffee, quiz),
  }));
}

function scoreCoffeeAlt(coffee, quiz) {
  let s = 0;
  s += 2 * matchIntensityScore(coffee.profile.intensity, quiz.intensity);
  s += 2 * matchProfilScore(coffee.flavor_tags, quiz.profil_gustatif);
  s += 1 * matchBrewingScore(coffee.best_for, quiz.brewing_method);
  s += 1 * matchNotesScore(coffee.tasting_notes, quiz.notes_specifiques);
  return s;
}

function matchIntensityScore(coffeeIntensity, userIntensity) {
  const ranges = {
    doux: [1, 2],
    equilibre: [2, 4],
    corse: [4, 5],
  };
  const [min, max] = ranges[userIntensity] || [1, 5];
  return coffeeIntensity >= min && coffeeIntensity <= max ? 1 : 0;
}

function matchProfilScore(flavorTags, profil) {
  const profilToTags = {
    'gourmand-chocolate': ['gourmand', 'chocolate', 'reconfortant', 'rond'],
    'vif-fruite': ['vif', 'fruite'],
    'complexe-floral': ['complexe', 'floral'],
  };
  const targetTags = profilToTags[profil] || [];
  return flavorTags.some(t => targetTags.includes(t)) ? 1 : 0;
}

function matchBrewingScore(bestFor, brewingMethod) {
  if (!brewingMethod) return 0.5;
  return bestFor.includes(brewingMethod) ? 1 : 0.5;
}

function matchNotesScore(tastingNotes, userNotes) {
  if (!userNotes?.length) return 0;
  const overlap = tastingNotes.filter(n => userNotes.includes(n)).length;
  return Math.min(overlap * 0.5, 1);
}

function buildAltReason(coffee, quiz) {
  const tags = coffee.flavor_tags.slice(0, 2).join(' et ');
  return `${coffee.name} (${coffee.origin}) — ${tags}, en café pur.`;
}

export function match(quiz, { coffees, archetypes }) {
  const archetype = selectArchetype(archetypes, quiz);
  const recipe = archetype.blend_recipes[quiz.brewing_method]
              || archetype.blend_recipes.espresso;

  if (!archetype.blend_recipes[quiz.brewing_method]) {
    console.warn(`Recipe absente pour ${archetype.id}/${quiz.brewing_method}, fallback sur espresso`);
  }

  const composition = recipe.map(item => ({
    coffee: coffees.find(c => c.id === item.coffee_id),
    percentage: item.percentage,
  }));

  const alternatives = computeAlternatives(coffees, quiz, recipe);

  return {
    archetype,
    blend: {
      method: quiz.brewing_method,
      roast_level: quiz.roast_level,
      composition,
      story: archetype.blend_story,
    },
    alternatives,
  };
}

export function validateRecipes(archetypes) {
  const errors = [];
  archetypes.forEach(a => {
    Object.entries(a.blend_recipes).forEach(([method, recipe]) => {
      const sum = recipe.reduce((acc, r) => acc + r.percentage, 0);
      if (sum !== 100) {
        errors.push(`${a.id}/${method}: somme = ${sum}, attendu 100`);
      }
    });
  });
  return errors;
}
