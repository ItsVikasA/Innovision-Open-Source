# Curriculum-Based Course Generation Guide

## Overview
Your InnoVision platform now supports curriculum-based course generation for LKG to Class 12 (CBSE & State boards).

## How to Use

### 1. Access the Course Generator
Navigate to `/generate` page in your application.

### 2. Two Generation Modes

#### **Custom Topic Mode** (Original)
- Enter any topic you want to learn
- Select knowledge level, time commitment, difficulty, and completion time
- Generate personalized courses on any subject

#### **Curriculum Based Mode** (NEW!)
- Select your class (LKG to Class 12)
- Choose board (CBSE or State)
- For Class 11 & 12: Select stream (Science/Commerce/Arts)
- Pick a subject from the curriculum
- View all topics that will be covered
- Generate a complete curriculum-aligned course

### 3. Course Generation Process

When you click "Generate Curriculum-Based Course":
1. System creates a detailed prompt with all curriculum topics
2. AI generates chapter-wise breakdown aligned with the syllabus
3. Course includes age-appropriate content
4. Covers all topics from the selected subject
5. Redirects to your personalized roadmap

## Features

### Comprehensive Coverage
- **Pre-Primary**: LKG, UKG
- **Primary**: Class 1-5
- **Middle School**: Class 6-8
- **Secondary**: Class 9-10
- **Senior Secondary**: Class 11-12 (with streams)

### Board Support
- **CBSE**: Complete NCERT-aligned curriculum
- **State Board**: State syllabus coverage

### Stream Options (Class 11 & 12)
- Science (Physics, Chemistry, Math, Biology, CS)
- Commerce (Accountancy, Business Studies, Economics)
- Arts (History, Geography, Political Science, Economics, Sociology)

## Example Usage

### For a Class 10 CBSE Student:
1. Go to `/generate`
2. Click "Curriculum Based" tab
3. Select "Class 10"
4. Select "CBSE"
5. Choose "Mathematics"
6. See topics: Real Numbers, Polynomials, Trigonometry, etc.
7. Click "Generate Curriculum-Based Course"
8. Get a complete Math course for Class 10 CBSE

### For a Class 12 Science Student:
1. Select "Class 12"
2. Select "CBSE"
3. Select "SCIENCE" stream
4. Choose "Physics"
5. See topics: Electrostatics, Magnetism, Optics, etc.
6. Generate comprehensive Physics course

## Integration with Existing Features

The curriculum-based courses work with all your existing features:
- ✅ Progress tracking
- ✅ XP points and achievements
- ✅ Interactive tasks (Quiz, Fill-ups, Match)
- ✅ AI-powered content generation
- ✅ User authentication
- ✅ Course limit management (6 courses max)

## Technical Details

### Files Created
1. `src/lib/curriculum-data.js` - Complete curriculum structure
2. `src/components/CurriculumSelector.jsx` - Reusable selector component
3. `src/app/curriculum/page.jsx` - Standalone curriculum browser
4. Modified `src/app/generate/page.jsx` - Added curriculum tab

### API Usage
Uses the same `/api/user_prompt` endpoint with enhanced prompts that include:
- Subject name
- All curriculum topics
- Class level
- Board type
- Stream (if applicable)

## Benefits

1. **Structured Learning**: Follows official curriculum
2. **Exam Preparation**: Covers all syllabus topics
3. **Age-Appropriate**: Content tailored to class level
4. **Board-Specific**: CBSE or State board alignment
5. **Complete Coverage**: All subjects and topics included

## Future Enhancements

Potential additions:
- Chapter-wise test papers
- Previous year questions
- Board exam pattern practice
- Subject-wise difficulty levels
- Multi-language support for regional boards
- Video lectures integration
- Practice problem banks

## Support

For any issues or questions:
- Check the console for errors
- Ensure you're logged in
- Verify you haven't reached the 6-course limit
- Make sure all selections are made before generating

---

**Happy Learning! 📚**
