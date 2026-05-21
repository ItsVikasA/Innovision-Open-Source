const fs = require('fs');
const path = require('path');

const filesToClean = [
  'src/app/api/reviews/route.js',
  'src/app/api/reviews/[reviewId]/route.js',
  'src/app/api/reviews/[reviewId]/vote/route.js',
  'src/app/api/reviews/[reviewId]/report/route.js',
  'src/components/reviews/CourseReviews.jsx',
  'src/components/reviews/ReviewList.jsx',
  'src/components/reviews/ReviewForm.jsx',
  'src/components/reviews/StarRating.jsx',
  'src/app/roadmap/[id]/page.jsx'
];

filesToClean.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove single line JS comments (// ...) but ignore URLs
    content = content.replace(/(?<!https?:)\/\/.*$/gm, '');
    
    // Remove JSX comments {/* ... */}
    content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    
    // Clean up multiple blank lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned ${file}`);
  }
});
