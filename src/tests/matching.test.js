import { describe, it, expect } from 'vitest';
import archetypes from '../data/archetypes.json';
import coffees from '../data/coffees.json';
import { scoreArchetype, selectArchetype, computeAlternatives, match, validateRecipes } from '../lib/matching.js';

const aventurier = archetypes.find(a => a.id === 'aventurier_chocolate');

describe('scoreArchetype', () => {
  it('score plein sur match parfait des 4 axes obligatoires', () => {
    const quiz = {
      moment: 'matin',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'corse',
      roast_level: 'dark',
    };
    expect(scoreArchetype(aventurier, quiz)).toBe(10); // 3+3+2+2
  });

  it('score 0 si aucun axe ne matche', () => {
    const quiz = {
      moment: 'soir',
      profil_gustatif: 'complexe-floral',
      intensity: 'doux',
      roast_level: 'light',
    };
    expect(scoreArchetype(aventurier, quiz)).toBe(0);
  });

  it('ajoute des bonus pour les questions optionnelles', () => {
    const quiz = {
      moment: 'matin',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'corse',
      roast_level: 'dark',
      notes_specifiques: ['chocolat'],
      acidite_toleree: 'faible',
      experience_level: 'amateur',
    };
    // base 10 + chocolat (note overlap, choc bucket) +1 + faible+choc +1 + amateur+gourmand-chocolate +1 = 13
    expect(scoreArchetype(aventurier, quiz)).toBe(13);
  });
});

describe('selectArchetype', () => {
  it('retourne l\'archétype au meilleur score', () => {
    const quiz = {
      moment: 'matin',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'corse',
      roast_level: 'dark',
    };
    const result = selectArchetype(archetypes, quiz);
    expect(result.id).toBe('aventurier_chocolate');
  });

  it('fallback sur "decouverte" si aucun score >= seuil', () => {
    const quiz = {
      moment: 'jamais',
      profil_gustatif: 'inexistant',
      intensity: 'inconnu',
      roast_level: 'inconnu',
    };
    const result = selectArchetype(archetypes, quiz);
    expect(result.id).toBe('decouverte');
  });

  it('départage par les 4 axes obligatoires en cas d\'égalité', () => {
    const quiz = {
      moment: 'soir',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'doux',
      roast_level: 'medium',
    };
    const result = selectArchetype(archetypes, quiz);
    expect(result.id).toBe('soir_chocolate_doux');
  });
});

describe('computeAlternatives', () => {
  it('retourne 2 cafés ranking-déterminé', () => {
    const quiz = {
      brewing_method: 'espresso',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'corse',
    };
    const blendComposition = [{ coffee_id: 'san_rafael', percentage: 60 }];
    const alts = computeAlternatives(coffees, quiz, blendComposition);
    expect(alts).toHaveLength(2);
    expect(alts[0].coffee.id).not.toBe('san_rafael');
  });

  it('exclut un café déjà majoritaire dans le blend', () => {
    const quiz = {
      brewing_method: 'espresso',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'corse',
    };
    const blendComposition = [{ coffee_id: 'san_rafael', percentage: 60 }];
    const alts = computeAlternatives(coffees, quiz, blendComposition);
    expect(alts.every(a => a.coffee.id !== 'san_rafael')).toBe(true);
  });
});

describe('match (intégration)', () => {
  it('retourne archetype + blend + alternatives + roast_level', () => {
    const quiz = {
      brewing_method: 'espresso',
      moment: 'matin',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'corse',
      roast_level: 'dark',
    };
    const result = match(quiz, { coffees, archetypes });

    expect(result.archetype.id).toBe('aventurier_chocolate');
    expect(result.blend.method).toBe('espresso');
    expect(result.blend.roast_level).toBe('dark');
    expect(result.blend.composition.length).toBeGreaterThan(0);
    expect(result.blend.composition.reduce((a, c) => a + c.percentage, 0)).toBe(100);
    expect(result.alternatives.length).toBeGreaterThanOrEqual(1);
    // aucune alternative ne doit reprendre un café déjà présent dans le blend
    expect(
      result.alternatives.every(a => !result.blend.composition.some(c => c.coffee.id === a.coffee.id)),
    ).toBe(true);
  });

  it('fallback sur recette espresso si la recette du mode est absente', () => {
    const fakeArch = {
      ...archetypes[0],
      blend_recipes: { espresso: archetypes[0].blend_recipes.espresso },
    };
    const quiz = {
      brewing_method: 'aeropress',
      moment: 'matin',
      profil_gustatif: 'gourmand-chocolate',
      intensity: 'corse',
      roast_level: 'dark',
    };
    const result = match(quiz, { coffees, archetypes: [fakeArch, archetypes.find(a => a.id === 'decouverte')] });
    expect(result.blend.composition.length).toBe(fakeArch.blend_recipes.espresso.length);
  });
});

describe('validateRecipes', () => {
  it('toutes les recettes des archétypes seed somment à 100%', () => {
    const errors = validateRecipes(archetypes);
    expect(errors).toEqual([]);
  });

  it('toutes les recettes référencent des coffee_id existants', () => {
    const validIds = new Set(coffees.map(c => c.id));
    archetypes.forEach(a => {
      Object.values(a.blend_recipes).forEach(recipe => {
        recipe.forEach(item => {
          expect(validIds.has(item.coffee_id)).toBe(true);
        });
      });
    });
  });
});
