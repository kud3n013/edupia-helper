# edupia-feedback-prompt-generator
A Feedback Prompt Generator

## Description
This is a feedback prompt generator that create prompt to feed to an LLM after and create a feedback for a student. The prompt is created based on the student's performance in a lesson. The feedbacks are meant for the parents to read so the app and the form are in Vietnamese.

The app is web based (html, css, js) and uses input from the user to generate the form. Using the form, users (teachers) can paste that into any LLM of choice to generate a feedback for the student. 

### Requirements set for the LLM
1. Output a compact, precise and clear single markdown paragraph feedback for 2 specific criteria, namely "Tiếp thu kiến thức" and "Thái độ học tập".
2. The feedback should be in Vietnamese
3. Refer to the student as "em" or their name
### Form Fields
1. A text input field for student's name
2. A large text input field for lesson content called "Nội dung bài học"
3. 