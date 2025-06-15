/**************************************************************
 * 0)  MENU – appears on every open
 **************************************************************/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Classroom Tools')
    .addItem('Create Classroom Assignment',      'createAssignmentInClassroom')
    .addSeparator()
    .addItem('Import Submissions to Sheet',      'pickCourseAndAssignment')
    .addSeparator()
    .addItem('Post Marks + Feedback + Return',   'postMarksAttachFeedback')
    .addToUi();
}

/**************************************************************
 * 1)  CREATE a new assignment in Classroom
 **************************************************************/
function createAssignmentInClassroom() {
  const ui = SpreadsheetApp.getUi();

  /* choose course --------------------------------------------------------- */
  const courses = (Classroom.Courses.list({teacherId: 'me'}).courses) || [];
  if (!courses.length) { ui.alert('No courses found.'); return; }

  const courseIndex = promptPick_(ui, 'Select a Course', courses.map(
    (c, i) => `${i}: ${c.name} (ID ${c.id})`
  ));
  if (courseIndex === null) return;
  const course = courses[courseIndex];

  /* gather details -------------------------------------------------------- */
  const title   = promptText_(ui, 'Assignment Title',        'Enter a title:', 'Untitled');
  if (title === null) return;
  const descr   = promptText_(ui, 'Assignment Description',  'Details/instructions (optional):', '');
  if (descr === null) return;
  const points  = Number(promptText_(ui, 'Max Points',       'e.g. 100:', '100'));
  if (isNaN(points)) { ui.alert('Invalid points value.'); return; }
  const dueStr  = promptText_(ui, 'Due Date',                'YYYY-MM-DD (or blank):', '');

  /* build request --------------------------------------------------------- */
  const cw = {
    title: title,
    description: descr,
    workType: 'ASSIGNMENT',
    state: 'PUBLISHED',
    maxPoints: points,
  };
  if (dueStr) {
    const [y,m,d] = dueStr.split('-').map(Number);
    cw.dueDate = {year:y, month:m, day:d};
    cw.dueTime = {hours:23, minutes:59};
  }

  try {
    const res = Classroom.Courses.CourseWork.create(cw, course.id);
    ui.alert(`Assignment created:\n${res.title}\nID: ${res.id}`);
  } catch (e) {
    ui.alert(`Error: ${e.message}`);
  }
}

/**************************************************************
 * 2)  IMPORT submissions for marking
 **************************************************************/
function pickCourseAndAssignment() {
  const ui = SpreadsheetApp.getUi();

  /* choose course --------------------------------------------------------- */
  const courses = (Classroom.Courses.list({teacherId:'me'}).courses) || [];
  if (!courses.length) { ui.alert('No courses.'); return; }

  const cIndex = promptPick_(ui, 'Select Course',
    courses.map((c,i)=>`${i}: ${c.name}`));
  if (cIndex === null) return;
  const course = courses[cIndex];

  /* choose assignment ----------------------------------------------------- */
  const work = (Classroom.Courses.CourseWork.list(course.id).courseWork) || [];
  if (!work.length) { ui.alert('No assignments in that course.'); return; }

  const wIndex = promptPick_(ui, 'Select Assignment',
    work.map((a,i)=>`${i}: ${a.title}`));
  if (wIndex === null) return;
  const cw = work[wIndex];

  /* import submissions ---------------------------------------------------- */
  listSubmissionsToSheetWithDocText(course.id, cw.id);

  /* store IDs for later grading call -------------------------------------- */
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
                .getSheetByName('Sheet1') || SpreadsheetApp.getActiveSheet();
  sheet.getRange('F1').setValue('COURSE_ID');
  sheet.getRange('G1').setValue('ASSIGNMENT_ID');
  sheet.getRange('F2').setValue(course.id);
  sheet.getRange('G2').setValue(cw.id);
  ui.alert('Submissions imported and IDs saved in F2 / G2.');
}

/* pulls TURNED_IN or RETURNED docs into the sheet ------------------------- */
function listSubmissionsToSheetWithDocText(courseId, courseWorkId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
                 .getSheetByName('Sheet1') || SpreadsheetApp.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  let subs = (Classroom.Courses.CourseWork.StudentSubmissions
               .list(courseId, courseWorkId).studentSubmissions) || [];
  subs = subs.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED');
  if (!subs.length) { ui.alert('No turned-in submissions.'); return; }

  const rows = [['Student Name','Doc Text','Submission ID','Mark','Feedback']];
  subs.forEach(s => {
    const name = Classroom.UserProfiles.get(s.userId).name.fullName;
    let body = '';
    (s.assignmentSubmission?.attachments || []).forEach(att=>{
      const id = att.driveFile?.id;
      if (id) {
        try { body += DocumentApp.openById(id).getBody().getText() + '\n\n'; }
        catch(e){ Logger.log(`Cannot read doc ${id}: ${e.message}`); }
      }
    });
    rows.push([name, body.trim(), s.id,'','']);
  });
  sheet.clearContents();
  sheet.getRange(1,1,rows.length,rows[0].length).setValues(rows);
  ui.alert(`Fetched ${subs.length} submissions.`);
}

/**************************************************************
 * 3)  POST marks, attach feedback Doc, and RETURN
 **************************************************************/
function postMarksAttachFeedback() {
  const ui    = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
                .getSheetByName('Sheet1') || SpreadsheetApp.getActiveSheet();
  const courseId     = sheet.getRange('F2').getValue();
  const courseWorkId = sheet.getRange('G2').getValue();
  if (!courseId || !courseWorkId) { ui.alert('Run “Import Submissions” first.'); return; }

  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(1,1,lastRow,5).getValues();   // A-E
  if (data.length < 2) { ui.alert('Nothing to post.'); return; }

  const folder = getOrCreateFolder_('Automated Feedback');
  let done = 0;

  for (let r = 1; r < data.length; r++) {
    const [name,, id, mark, fb] = data[r];
    if (!id || (mark === '' && fb === '')) continue;

    try {
      if (mark !== '') {
        Classroom.Courses.CourseWork.StudentSubmissions.patch(
          { draftGrade: mark },
          courseId, courseWorkId, id,
          { updateMask: 'draftGrade' }
        );
      }
      if (fb !== '') {
        const fileId = createFeedbackDoc_(name, fb, folder);
        Classroom.Courses.CourseWork.StudentSubmissions.modifyAttachments(
          { addAttachments: [{ driveFile: { id: fileId } }] },
          courseId, courseWorkId, id
        );
      }
      Classroom.Courses.CourseWork.StudentSubmissions['return'](
        {}, courseId, courseWorkId, id
      );
      done++;
    } catch(e) {
      Logger.log(`Row ${r+1} (${name}): ${e.message}`);
    }
  }
  ui.alert(`Finished — processed ${done} submissions.`);
}

/* ----------------- helpers --------------------------------------------- */
function getOrCreateFolder_(name){
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
function createFeedbackDoc_(student, text, folder){
  const doc = DocumentApp.create(`${student} – Feedback`);
  doc.getBody().setText(text);
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  return file.getId();
}
function promptPick_(ui, title, lines){
  const res = ui.prompt(title, lines.join('\n')+'\n\nType number:', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  const idx = parseInt(res.getResponseText(),10);
  return isNaN(idx) ? null : idx;
}
function promptText_(ui, title, msg, def){
  const res = ui.prompt(title, msg, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  const t = res.getResponseText().trim();
  return t === '' ? def : t;
}