# Initial Prompt
### Form requirements
- Markdown format

### Form Fields
1. A text input field for student's name
2. A large text input field for lesson content called "Nội dung bài học"
3. "## Tiếp thu kiến thức" with sliders (1 to 10, with 10 as excellence) for different criteria namely "Từ vựng", "Ngữ pháp", "Phát âm", "Ngữ âm", "Đọc hiểu", "Nghe hiểu" and "Phản xạ". In front of each slider, provide a checkbox to include the corresponding criteria in the form or not.
4. "## Thái độ học tập", under which will have the following criteria with different catergoriest to choose from 
```
### Năng lượng/ tinh thần học tập trên lớp
- [ ] tích cực, 
- [ ] sôi nổi, 
- [ ] vui vẻ, 
- [ ] hứng thú, 
- [ ] tự tin, 
- [ ] lạc quan, 
- [ ] mệt mỏi, 
- [ ] chán nản, 
- [ ] trầm tính, 
- [ ] tự ti, 
- [ ] xấu hổ, 
- [ ] ngại nói…
### Khả năng tập trung
- [ ] tập trung nghe giảng, 
- [ ] chú ý bài học, 
- [ ] tích cực phát biểu, 
- [ ] sao nhãng, 
- [ ] làm việc riêng, 
- [ ] không tập trung, 
- [ ] lơ là
### Thái độ trong các hoạt động với bạn học
- [ ] hòa đồng, 
- [ ] biết chia sẻ, 
- [ ] giúp đỡ bạn bè, 
- [ ] nóng nảy, 
- [ ] chưa hòa đồng, 
- [ ] chưa biết tương tác với bạn
### Thái độ với giáo viên
- [ ] biết nghe lời, 
- [ ] lễ phép, 
- [ ] ngoan ngoãn, 
- [ ] chưa vâng lời, 
- [ ] còn để thầy cô nhắc nhở nhiều
```

### Requirements set for the LLM
1. Output a compact, precise and clear single markdown paragraph feedback for 2 specific criteria, namely "Tiếp thu kiến thức" and "Thái độ học tập". 
2. Make sure to put "Tiếp thu kiến thức" and "Thái độ học tập" inside 2 separate code brackets for the teacher to easily copy and paste them.
3. The feedback should be in Vietnamese
4. Refer to the student as "em" or their name
5. Avoid using the score (such as "8/10") in the output feedback to sound more natural and less "automated". Just give the evaluation based on the criteria. 

