import mongoose from 'mongoose';

const themeCardSchema = new mongoose.Schema({
  badgeText: {
    type: String,
    default: 'THEME'
  },
  imageUrl: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  buttonText: {
    type: String,
    default: 'Explore Collection'
  },
  buttonLink: {
    type: String,
    default: '/collections/living'
  },
  order: {
    type: Number,
    default: 0
  }
});

const themeSectionSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      default: 'CURATED ARCHITECTURE & THEMES'
    },
    heading: {
      type: String,
      default: 'Spaces Sculpted for Serenity'
    },
    subheading: {
      type: String,
      default: 'We design with the belief that calm interiors create quiet minds. Explore our architectural collections curated for modern living.'
    },
    cards: {
      type: [themeCardSchema],
      default: []
    }
  },
  { timestamps: true }
);

export const defaultThemeData = {
  eyebrow: 'CURATED ARCHITECTURE & THEMES',
  heading: 'Spaces Sculpted for Serenity',
  subheading: 'We design with the belief that calm interiors create quiet minds. Explore our architectural collections curated for modern living.',
  cards: [
    {
      badgeText: 'THEME 01',
      imageUrl: '',
      category: 'LIVING & LOUNGE',
      title: 'The Minimalist Living Room',
      description: 'Solid Chittagong teak sofas and architectural low-tables. Proportion, tactile grain, and generous negative space that allows rooms to breathe.',
      buttonText: 'Explore Living Collection',
      buttonLink: 'room:living-room',
      order: 1
    },
    {
      badgeText: 'THEME 02',
      imageUrl: '',
      category: 'MATERIALITY',
      title: 'Warm Japandi Textures',
      description: "An organic dialogue between raw timber and moisture-sealed melamine board. Crafted for Bangladesh's humid seasons without warping.",
      buttonText: 'Learn About Board Durability',
      buttonLink: '#material',
      order: 2
    },
    {
      badgeText: 'THEME 03',
      imageUrl: '',
      category: 'STUDY & STORAGE',
      title: 'Modular Architectural Joinery',
      description: 'Clean-lined study desks, ergonomic bookshelves, and multi-door wardrobes engineered with smooth silent hardware for lifetime utility.',
      buttonText: 'Explore Study & Desks',
      buttonLink: 'room:reading-room',
      order: 3
    }
  ]
};

export const ThemeSection = mongoose.model('ThemeSection', themeSectionSchema);
