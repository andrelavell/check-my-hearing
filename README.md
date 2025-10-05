# CheckMyHearing - Professional Hearing Test

A modern, mobile-responsive web application for conducting online hearing tests. Users can assess their hearing health through a professional-grade test that includes questionnaire, frequency testing, and detailed results.

## Features

- **Clean, Modern UI**: Built with React and TailwindCSS for a premium feel
- **Mobile-First Design**: Fully responsive and optimized for phones
- **Pre-Test Questionnaire**: Gathers user context before testing
- **Authentic Audio Testing**: Tests 6 frequencies in each ear using Web Audio API
- **Detailed Results**: Includes audiogram visualization and comprehensive breakdown
- **Professional Feel**: Mimics real audiologist testing experience

## Getting Started

### Installation

```bash
cd hearing-test
npm install
```

### Development

```bash
npm run dev
```

The app will open at http://localhost:3000

### Build for Production

```bash
npm run build
```

## How It Works

1. **Landing Page**: Introduces the test and provides preparation instructions
2. **Questionnaire**: 4 quick questions to understand user context
3. **Hearing Test**: Tests 12 frequencies (6 per ear) using pure tone audiometry
4. **Results**: Shows detailed results with audiogram, scores, and recommendations

## Technology Stack

- **React 18**: Modern UI framework
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library
- **Recharts**: Data visualization for audiogram
- **Web Audio API**: For generating test tones

## Requirements

- Modern web browser with Web Audio API support
- Headphones or earbuds recommended
- Quiet environment for accurate testing

## Disclaimer

This is a screening tool and not a replacement for professional hearing evaluation. Users should consult with a licensed audiologist for accurate diagnosis and treatment.

## License

MIT
