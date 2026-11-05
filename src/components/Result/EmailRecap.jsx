import { useMemo, useState } from 'react';
import coffees from '../../data/coffees.json';
import archetypes from '../../data/archetypes.json';
import { match } from '../../lib/matching.js';

// 👉 Adresse de réception des commandes par email.
const ORDER_EMAIL = 'contact@torrea.fr';

const ROAST_LABELS = { light: 'Light', medium: 'Medium', dark: 'Dark' };
const GRIND_LABELS = { grain: 'En grain', moulu: 'Moulu' };
const METHOD_LABELS = {
  espresso: 'Espresso',
  filtre: 'V60 / Filtre',
  moka: 'Cafetière italienne',
  aeropress: 'Aeropress',
  piston: 'Piston (French Press)',
};

const WEIGHTS = ['250g', '500g', '1kg'];

const PICKUP_LOCATIONS = [
  'Marché Place de la Sardane à Amélie-les-Bains — Tous les jeudis matin',
  'Marché de Producteurs de Pays à Arles-sur-Tech — Tous les mercredis matin',
];

function buildMailto(result, quiz, weight, quantity, customer, pickup) {
  const methodLabel = METHOD_LABELS[result.blend.method] || result.blend.method;
  const roastLabel = ROAST_LABELS[result.blend.roast_level] || result.blend.roast_level;
  const grindLabel = quiz.grind_type
    ? (GRIND_LABELS[quiz.grind_type] || quiz.grind_type)
    : 'Non précisé';

  const subject = `Commande blend personnalisé — ${result.archetype.name}`;

  const lines = [
    'Bonjour,',
    '',
    'Je souhaite commander le blend personnalisé suivant, à récupérer sur place sur un marché :',
    '',
    'Mes coordonnées :',
    `Nom : ${customer.lastName}`,
    `Prénom : ${customer.firstName}`,
    `Email : ${customer.email}`,
    `Téléphone : ${customer.phone || 'Non précisé'}`,
    '',
    `Profil : ${result.archetype.name}`,
    `Mode d'extraction : ${methodLabel}`,
    `Niveau de torréfaction : ${roastLabel}`,
    `Mouture : ${grindLabel}`,
    `Poids : ${weight}`,
    `Quantité : ${quantity}`,
    `Lieu de retrait : ${pickup}`,
    '',
    'Composition du blend :',
    ...result.blend.composition.map(
      ({ coffee, percentage }) => `- ${percentage}% ${coffee.name} (${coffee.origin})`,
    ),
    '',
    'Merci !',
  ];

  const body = lines.join('\n');
  return `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailRecap({ quiz, onBack }) {
  const result = useMemo(() => match(quiz, { coffees, archetypes }), [quiz]);
  const [weight, setWeight] = useState('250g');
  const [quantity, setQuantity] = useState(1);
  const [pickup, setPickup] = useState(PICKUP_LOCATIONS[0]);
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const setField = (field) => (e) =>
    setCustomer((c) => ({ ...c, [field]: e.target.value }));

  const isValid =
    customer.firstName.trim() &&
    customer.lastName.trim() &&
    EMAIL_RE.test(customer.email.trim());

  const handleSend = () => {
    if (!isValid) return;
    const trimmed = {
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      email: customer.email.trim(),
      phone: customer.phone.trim(),
    };
    const mailto = buildMailto(result, quiz, weight, quantity, trimmed, pickup);
    window.location.href = mailto;
  };

  return (
    <div className="recap">
      <h2 className="recap__title">Envoyer ma commande par email</h2>
      <p className="recap__subtitle">
        Choisis le poids et la quantité, puis confirme pour ouvrir ton email pré-rempli.
      </p>

      <p className="recap__next-step">
        ℹ️ La commande par email concerne uniquement le retrait <strong>sur place</strong>,
        sur l'un des marchés où je suis présent. Pour un <strong>envoi par la poste</strong>,
        merci de passer par le bouton « Commander &amp; payer », qui gère le paiement et la
        livraison.
      </p>

      <section className="recap__block">
        <p className="recap__eyebrow">Ton profil</p>
        <p className="recap__value">{result.archetype.name}</p>
      </section>

      <section className="recap__block">
        <p className="recap__eyebrow">Mode d'extraction</p>
        <p className="recap__value">{METHOD_LABELS[result.blend.method] || result.blend.method}</p>
      </section>

      <section className="recap__block">
        <p className="recap__eyebrow">Niveau de torréfaction</p>
        <p className="recap__value">{ROAST_LABELS[result.blend.roast_level] || result.blend.roast_level}</p>
      </section>

      {quiz.grind_type && (
        <section className="recap__block">
          <p className="recap__eyebrow">Mouture</p>
          <p className="recap__value">{GRIND_LABELS[quiz.grind_type] || quiz.grind_type}</p>
        </section>
      )}

      <section className="recap__block">
        <p className="recap__eyebrow">Composition du blend</p>
        <ul className="recap__composition">
          {result.blend.composition.map(({ coffee, percentage }) => (
            <li key={coffee.id}>
              <strong>{percentage}% {coffee.name}</strong>
              <span className="recap__origin"> — {coffee.origin}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="recap__block">
        <p className="recap__eyebrow">Tes coordonnées</p>
        <div className="recap__form">
          <label className="recap__field">
            <span>Prénom</span>
            <input
              className="recap__input"
              type="text"
              autoComplete="given-name"
              value={customer.firstName}
              onChange={setField('firstName')}
            />
          </label>

          <label className="recap__field">
            <span>Nom</span>
            <input
              className="recap__input"
              type="text"
              autoComplete="family-name"
              value={customer.lastName}
              onChange={setField('lastName')}
            />
          </label>

          <label className="recap__field">
            <span>Adresse email</span>
            <input
              className="recap__input"
              type="email"
              autoComplete="email"
              value={customer.email}
              onChange={setField('email')}
            />
          </label>

          <label className="recap__field">
            <span>Numéro de téléphone (optionnel)</span>
            <input
              className="recap__input"
              type="tel"
              autoComplete="tel"
              value={customer.phone}
              onChange={setField('phone')}
            />
          </label>
        </div>
      </section>

      <section className="recap__block">
        <div className="recap__form">
          <div className="recap__field">
            <span>Poids</span>
            <div className="recap__weights">
              {WEIGHTS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`bubble bubble--small${weight === w ? ' bubble--selected' : ''}`}
                  aria-pressed={weight === w}
                  onClick={() => setWeight(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <label className="recap__field">
            <span>Quantité</span>
            <input
              className="recap__input"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setQuantity(Number.isNaN(n) || n < 1 ? 1 : n);
              }}
            />
          </label>

          <label className="recap__field">
            <span>Lieu de retrait</span>
            <select
              className="recap__input"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            >
              {PICKUP_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!isValid && (
        <p className="recap__hint recap__hint--warn">
          Renseigne ton prénom, ton nom et un email valide pour envoyer ta commande.
        </p>
      )}

      <div className="recap__actions">
        <button
          type="button"
          className={`cta${isValid ? '' : ' cta--disabled'}`}
          onClick={handleSend}
          disabled={!isValid}
        >
          Confirmer & envoyer
        </button>
        <button type="button" className="cta cta--secondary" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
