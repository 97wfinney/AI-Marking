# AI-Powered Google Classroom Marker

An automated marking system that combines Google Classroom, Google Apps Script, and OpenAI to provide personalised feedback at scale for GCSE Physics (adaptable to any subject).

## ⚠️ Important Disclaimer

**This is a work in progress and should NOT replace professional teacher marking.** This tool is designed to supplement teacher assessment by providing additional detailed feedback that students might not otherwise receive due to time constraints. Always review AI-generated marks and feedback before returning to students.

## 🎯 Overview

This tool supplements traditional marking by:
- Creating assignments directly in Google Classroom
- Automatically collecting student submissions
- Using AI to generate detailed, personalised feedback that would be time-prohibitive to write manually
- Returning marked work with comprehensive feedback documents

**The goal**: Provide students with the detailed, constructive feedback they deserve but often don't receive due to time constraints. This tool handles the time-intensive feedback writing, allowing teachers to focus on moderating results and providing additional support where needed.

## 🚀 Features

- **Automated Assignment Creation**: Create assignments in Google Classroom with due dates and mark values
- **Bulk Submission Import**: Pull all student submissions into a Google Sheet for processing
- **AI-Powered Marking**: Uses OpenAI's GPT models to mark against your marking scheme
- **Personalised Feedback**: Generates 6-8 paragraphs of detailed, student-specific feedback
- **Automated Return**: Posts marks and attaches feedback documents back to Google Classroom

## 📋 Prerequisites

- Google Workspace account with Google Classroom access
- OpenAI API key
- Python 3.7+
- Required Python packages: `pandas`, `openai`

## 🔧 Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/97wfinney/AI-Marking.git
   cd AI-Marking
   ```

2. **Set Up Python Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Google Apps Script Setup**
   - Open a new Google Sheet
   - Go to Extensions → Apps Script
   - Copy the contents of `classroom_tools.gs` into the script editor
   - Save and authorise the script
   - Close the Apps Script editor
   - Refresh your Google Sheet
   - You should now see "Classroom Tools" in the top menu bar (between "Help" and the other menus)

## 📖 Usage

**Important**: You MUST create assignments using the Apps Script menu. The script can only access assignments it creates - it cannot access assignments created manually through Google Classroom.

### Step 1: Create Assignment (Required - Use Apps Script)
1. Open your Google Sheet
2. Look at the top menu bar - you'll see **Classroom Tools** appear after the script loads
3. Click **Classroom Tools → Create Classroom Assignment**
4. Select your course and enter assignment details
5. The script will create the assignment in Google Classroom
6. Manually add a Google Doc template to the assignment with questions and "Answer:" sections below each question

### Step 2: Collect Submissions
1. After students submit, go to **Classroom Tools → Import Submissions to Sheet**
2. Select the course and assignment
3. The script will populate your sheet with student names and their responses

### Step 3: Mark with AI
1. Download the sheet as CSV
2. Run the marking script:
   ```bash
   python mark_and_feedback.py submissions.csv --general docs/example_rubric.txt
   ```

### Step 4: Return Marked Work
1. Copy the generated marks and feedback back to your Google Sheet
2. Go to **Classroom Tools → Post Marks + Feedback + Return**
3. The script will:
   - Update marks in Google Classroom
   - Create individual feedback documents
   - Return the assignments to students

## ⚙️ Configuration

### Marking Parameters
- `--model`: OpenAI model to use (default: `gpt-4o-mini`)
- `--delay`: Delay between API calls in seconds (default: 1.0)
- `--name-column`: Column containing student names (default: `name`)
- `--answer-column`: Column containing student answers (default: `student_answer`)
- `--score-column`: Column for marks (default: `score`)
- `--feedback-column`: Column for feedback (default: `feedback`)

### Marking Scheme Setup
Create a marking scheme file (see `docs/example_rubric.txt`). The AI will use this to assess student work consistently.

**Important**: The quality of AI feedback is directly dependent on the quality of your marking scheme. Be specific about:
- Exact criteria for each grade band
- Subject-specific terminology and concepts
- Common misconceptions to address
- The level of detail expected in student responses

A generic prompt will produce generic feedback. A detailed, task-specific prompt will produce valuable, personalised feedback.

## 🏗️ Architecture

```
Google Classroom
    ↓
Google Apps Script (Import)
    ↓
Google Sheets
    ↓
CSV Export
    ↓
Python + OpenAI API
    ↓
CSV with Marks & Feedback
    ↓
Google Sheets (Manual Copy)
    ↓
Google Apps Script (Return)
    ↓
Google Classroom (with feedback docs)
```

## 🔒 Security & Privacy

- Student data remains within your Google Workspace
- Only submission text is sent to OpenAI for marking
- API keys are stored securely as environment variables
- No student PII is logged or stored by the scripts
- Never commit your `.env` file to version control

## 📚 Best Practices

- **Always review** AI-generated marks and feedback before returning to students
- **Use as a supplement**, not a replacement for professional judgement
- **Moderate results** to ensure fairness and accuracy
- **Customise feedback** where the AI may have missed nuances
- **Monitor patterns** to identify students who may need additional support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Areas for improvement:
- Direct Google Sheets API integration (if permissions allow)
- Support for additional assignment types
- Batch processing optimisations
- Additional subject-specific marking schemes

## 📝 Licence

MIT Licence - see LICENCE file for details

## 🙏 Acknowledgements

- Built for educators who believe in the power of personalised feedback
- Inspired by the need to scale quality assessment in education
- Thanks to the Google Workspace and OpenAI teams for their APIs

## ⚠️ Limitations

- **Apps Script Assignment Creation**: You MUST create assignments through the Classroom Tools menu - the script cannot access assignments created manually in Google Classroom
- Manual CSV export/import step required due to institutional Google Workspace restrictions
- Requires Google Workspace admin approval for Apps Script permissions
- API costs apply for OpenAI usage (approximately £0.002 per submission with GPT-4o-mini)

## 📧 Contact

For questions or suggestions, please open an issue on this repository.

---

*Making personalised feedback accessible at scale* 🎓✨
