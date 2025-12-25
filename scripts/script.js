document.addEventListener('DOMContentLoaded', () => {
    // Existing Elements
    // (Removed legacy student feedback elements)


    // Navigation & Page Elements
    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');
    const pageDescription = document.getElementById('pageDescription');

    // Student Feedback Elements
    // (Removed legacy student feedback elements)


    // Lesson Feedback Elements
    const lessonFabRefresh = document.getElementById('lessonFabRefresh');
    const lessonGenerateBtn = document.getElementById('lessonGenerateBtn');
    const lessonCopyBtn = document.getElementById('lessonCopyBtn');
    const lessonOutputSection = document.getElementById('lessonOutputSection');
    const lessonPromptOutput = document.getElementById('lessonPromptOutput');

    // Theme Toggle Logic
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeCheckbox = document.getElementById('themeToggleCheckbox');

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeCheckbox) themeCheckbox.checked = true;
    }

    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            // Update Active Nav Item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show Target Page
            pageSections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.remove('hidden');
                    section.classList.add('active');
                } else {
                    section.classList.add('hidden');
                    section.classList.remove('active');
                }
            });

            // Update Header Description
            if (targetId === 'page-group-feedback') {
                pageDescription.textContent = 'Tạo prompt phản hồi cho học sinh (1-6 bạn)';
            } else if (targetId === 'page-lesson-feedback') {
                pageDescription.textContent = 'Tạo báo cáo tổng kết buổi học chuyên nghiệp';
            }
        });
    });



    // --- Legacy Student Feedback Logic Removed ---




    // --- Whole Lesson Feedback Logic (New) ---

    if (lessonFabRefresh) {
        lessonFabRefresh.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn làm mới tất cả thông tin buổi học?')) {
                document.getElementById('checkAtmosphere').checked = true;
                document.getElementById('selectAtmosphere').value = 'Sôi nổi';

                document.getElementById('checkProgress').checked = true;
                document.getElementById('selectProgress').value = 'Bình thường';

                document.getElementById('checkLate').checked = false;
                document.getElementById('inputLate').value = '';

                const reminderCheckboxes = document.querySelectorAll('input[name="reminder"]');
                reminderCheckboxes.forEach(cb => cb.checked = false);

                lessonOutputSection.classList.add('hidden');
                lessonPromptOutput.textContent = '';
            }
        });
    }

    lessonGenerateBtn.addEventListener('click', generateLessonFeedback);
    lessonCopyBtn.addEventListener('click', () => copyToClipboard(lessonPromptOutput, lessonCopyBtn));

    function generateLessonFeedback() {
        // Part 1: General Info
        let sentences = [];

        // Atmosphere Mapping
        const atmosphereMap = {
            'Sôi nổi': 'sôi nổi, các con hào hứng phát biểu xây dựng bài',
            'Trầm lặng': 'hơi trầm, các con cần tương tác nhiều hơn'
        };

        // Progress Mapping
        const progressMap = {
            'Bình thường': 'tốt đẹp, các con đều hiểu bài',
            'Trễ': 'kết thúc muộn hơn dự kiến một chút',
            'Sớm': 'kết thúc sớm hơn dự kiến'
        };

        // Atmosphere
        if (document.getElementById('checkAtmosphere').checked) {
            const val = document.getElementById('selectAtmosphere').value;
            const text = atmosphereMap[val] || val;
            sentences.push(`Không khí lớp học ${text}`);
        }

        // Progress
        if (document.getElementById('checkProgress').checked) {
            const val = document.getElementById('selectProgress').value;
            const text = progressMap[val] || val;
            sentences.push(`Buổi học diễn ra ${text}`);
        }

        // Late
        if (document.getElementById('checkLate').checked) {
            const val = document.getElementById('inputLate').value.trim();
            if (val) sentences.push(`Bạn ${val} vào muộn`);
        }

        let part1Text = "";
        if (sentences.length > 0) {
            part1Text = "1. " + sentences.join(". ") + ".";
        }

        // Part 2: Reminders
        let part2Text = "";
        const reminderCheckboxes = document.querySelectorAll('input[name="reminder"]:checked');
        if (reminderCheckboxes.length > 0) {
            const reminders = Array.from(reminderCheckboxes).map(cb => cb.value).join(", ");
            part2Text = `2. PH nhớ nhắc các em hoàn thành ${reminders}.`;
        }

        // Combine
        const finalOutput = [part1Text, part2Text].filter(t => t).join("\n\n");

        if (!finalOutput) {
            alert('Vui lòng chọn ít nhất một thông tin để tạo feedback!');
            return;
        }

        lessonPromptOutput.textContent = finalOutput;
        lessonOutputSection.classList.remove('hidden');
        lessonOutputSection.scrollIntoView({ behavior: 'smooth' });
    }

    // --- Shared Utilities ---


    // Apply to existing static sliders
    document.querySelectorAll('input[type="range"]').forEach(attachSliderWheelEvent);


});

// --- Shared Utilities (Global) ---
function attachSliderWheelEvent(slider) {
    const container = slider.parentElement;
    if (container) {
        container.classList.add('slider-interaction-area');

        container.addEventListener('wheel', (e) => {
            if (slider.disabled) return;
            e.preventDefault();
            const delta = Math.sign(e.deltaY) * -1;
            const currentVal = parseInt(slider.value);
            const min = parseInt(slider.min) || 0;
            const max = parseInt(slider.max) || 10;
            const step = parseInt(slider.step) || 1;
            let newVal = currentVal + (delta * step);
            if (newVal > max) newVal = max;
            if (newVal < min) newVal = min;
            if (newVal !== currentVal) {
                slider.value = newVal;
                slider.dispatchEvent(new Event('input'));
            }
        }, { passive: false });
    }
}

function copyToClipboard(element, button) {
    const textToCopy = element.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('primary');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('primary');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Không thể copy. Vui lòng chọn và copy thủ công.');
    });
}

// --- Group Feedback (4 Students) Logic ---

// Data / Config
// Data / Config
const MAX_STUDENTS = 6;
const CRITERIA_LIST = ['Từ vựng', 'Ngữ pháp', 'Phát âm', 'Ngữ âm', 'Đọc hiểu', 'Nghe hiểu', 'Phản xạ'];
const ATTITUDE_DATA = {
    'Năng lượng / Tinh thần': ['tích cực', 'sôi nổi', 'vui vẻ', 'hứng thú', 'tự tin', 'lạc quan', 'mệt mỏi', 'chán nản', 'trầm tính', 'tự ti', 'xấu hổ', 'ngại nói'],
    'Khả năng tập trung': ['tập trung nghe giảng', 'chú ý bài học', 'tích cực phát biểu', 'sao nhãng', 'làm việc riêng', 'không tập trung', 'lơ là'],
    'Thái độ với bạn học': ['hòa đồng', 'biết chia sẻ', 'giúp đỡ bạn bè', 'nóng nảy', 'chưa hòa đồng'],
    'Thái độ với giáo viên': ['biết nghe lời', 'lễ phép', 'ngoan ngoãn', 'chưa vâng lời', 'phải nhắc nhở nhiều']
};

// State
let groupState = {
    studentCount: 4,
    knowledgeMode: 'individual', // 'bulk' or 'individual'
    attitudeMode: 'individual',
    marketingName: '', // Not used yet but good to have
    students: Array.from({ length: MAX_STUDENTS }, () => ({
        name: '',
        scores: {},
        attitudes: []
    })),
    includedCriteria: ['Từ vựng', 'Ngữ pháp', 'Phản xạ'], // Default selection
    includedAttitudeCategories: Object.keys(ATTITUDE_DATA) // Default all active
};

// Initialize Scores
groupState.students.forEach(s => {
    CRITERIA_LIST.forEach(c => s.scores[c] = 8);
});

// Elements
const studentsContainer = document.getElementById('studentsContainer');
const studentCountInput = document.getElementById('studentCountInput');
const studentCountDisplay = document.getElementById('studentCountDisplay');
const navBadge = document.getElementById('navBadge');

const knowledgeGroupContainer = document.getElementById('knowledgeGroupContainer');
const attitudeGroupContainer = document.getElementById('attitudeGroupContainer');
const groupGenerateBtn = document.getElementById('groupGenerateBtn');
const groupFabRefresh = document.getElementById('groupFabRefresh');
const groupCopyBtn = document.getElementById('groupCopyBtn');
const groupPromptOutput = document.getElementById('groupPromptOutput');
const groupOutputSection = document.getElementById('groupOutputSection');

// Toggles
const knowBulkRadio = document.getElementById('know_bulk');
const knowIndiRadio = document.getElementById('know_indi');
const attBulkRadio = document.getElementById('att_bulk');
const attIndiRadio = document.getElementById('att_indi');

// Initialize
renderStudentInputs();
renderGroupKnowledge();
renderGroupAttitude();

// Student Count Slider
studentCountInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    groupState.studentCount = val;
    studentCountDisplay.textContent = val;
    if (navBadge) navBadge.textContent = val;

    renderStudentInputs();
    renderGroupKnowledge();
    renderGroupAttitude();
});

// Render Functions
function renderStudentInputs() {
    studentsContainer.innerHTML = '';
    // Update grid columns dynamically
    studentsContainer.style.gridTemplateColumns = `repeat(${groupState.studentCount}, 1fr)`;

    for (let i = 0; i < groupState.studentCount; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = `Học sinh ${i + 1}`;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `s${i + 1}_name`;
        input.placeholder = `Tên HS ${i + 1}`;
        input.value = groupState.students[i].name || '';

        input.addEventListener('input', (e) => {
            groupState.students[i].name = e.target.value;
            // Update labels in other sections immediately
            if (groupState.knowledgeMode === 'individual') renderGroupKnowledge();
            if (groupState.attitudeMode === 'individual') renderGroupAttitude();
        });

        div.appendChild(label);
        div.appendChild(input);
        studentsContainer.appendChild(div);
    }
}

// Event Listeners for Toggles
const handleKnowledgeToggle = () => {
    const selected = document.querySelector('input[name="know_mode"]:checked');
    if (selected) {
        groupState.knowledgeMode = selected.value;
        renderGroupKnowledge();
    }
};

const handleAttitudeToggle = () => {
    const selected = document.querySelector('input[name="att_mode"]:checked');
    if (selected) {
        groupState.attitudeMode = selected.value;
        renderGroupAttitude();
    }
};

document.querySelectorAll('input[name="know_mode"]').forEach(r => {
    r.addEventListener('change', handleKnowledgeToggle);
});

document.querySelectorAll('input[name="att_mode"]').forEach(r => {
    r.addEventListener('change', handleAttitudeToggle);
});

// Render Functions
function renderGroupKnowledge() {
    knowledgeGroupContainer.innerHTML = '';
    const isBulk = groupState.knowledgeMode === 'bulk';

    // 1. Render Criteria Selection Bar (Pills)
    const selectionBar = document.createElement('div');
    selectionBar.className = 'checkbox-grid'; // Reuse existing class for pills layout
    selectionBar.style.marginBottom = '1.5rem';
    selectionBar.style.paddingBottom = '1rem';
    selectionBar.style.borderBottom = '1px solid rgba(99, 102, 241, 0.1)';

    CRITERIA_LIST.forEach(criteria => {
        const label = document.createElement('label');
        label.className = 'pill-checkbox'; // Reuse styling

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = criteria;
        input.checked = groupState.includedCriteria.includes(criteria);

        input.onchange = (e) => {
            if (e.target.checked) {
                if (!groupState.includedCriteria.includes(criteria)) {
                    groupState.includedCriteria.push(criteria);
                    // Sort to maintain order
                    groupState.includedCriteria.sort((a, b) => CRITERIA_LIST.indexOf(a) - CRITERIA_LIST.indexOf(b));
                }
            } else {
                groupState.includedCriteria = groupState.includedCriteria.filter(c => c !== criteria);
            }
            renderGroupKnowledge(); // Re-render to show/hide rows
        };

        const span = document.createElement('span');
        span.textContent = criteria;

        label.appendChild(input);
        label.appendChild(span);
        selectionBar.appendChild(label);
    });
    knowledgeGroupContainer.appendChild(selectionBar);

    // 2. Render Active Rows
    CRITERIA_LIST.forEach(criteria => {
        // Skip if not included
        if (!groupState.includedCriteria.includes(criteria)) return;

        const row = document.createElement('div');
        row.className = 'group-row';

        // Header (Just text now)
        const headerDiv = document.createElement('div');
        headerDiv.style.marginBottom = '0.5rem';

        const labelText = document.createElement('h4');
        labelText.textContent = criteria;
        labelText.style.margin = '0';
        labelText.style.color = 'var(--primary-color)';

        headerDiv.appendChild(labelText);
        row.appendChild(headerDiv);

        // Controls Grid
        const grid = document.createElement('div');
        grid.className = `group-controls-grid ${isBulk ? 'bulk-mode' : ''}`;

        if (!isBulk) {
            grid.style.gridTemplateColumns = `repeat(${groupState.studentCount}, 1fr)`;
        } else {
            grid.style.gridTemplateColumns = '1fr';
        }

        const loopCount = isBulk ? 1 : groupState.studentCount;

        for (let i = 0; i < loopCount; i++) {
            const studentIndex = i;

            const wrapper = document.createElement('div');
            wrapper.className = 'control-item';

            // Label
            const label = document.createElement('label');
            if (isBulk) {
                label.textContent = "Tất cả học sinh";
            } else {
                const sName = document.getElementById(`s${i + 1}_name`)?.value || `HS ${i + 1}`;
                label.textContent = sName;
            }
            wrapper.appendChild(label);

            // Slider
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 1;
            slider.max = 10;
            slider.value = groupState.students[isBulk ? 0 : studentIndex].scores[criteria];


            // Output
            const output = document.createElement('div');
            output.style.fontWeight = 'bold';
            output.style.color = 'var(--primary-color)';
            output.textContent = slider.value;

            // Event
            slider.oninput = (e) => {
                const val = e.target.value;
                output.textContent = val;
                if (isBulk) {
                    groupState.students.forEach(s => s.scores[criteria] = val);
                } else {
                    groupState.students[studentIndex].scores[criteria] = val;
                }
            };

            wrapper.appendChild(slider);
            wrapper.appendChild(output);

            // Attach event helper AFTER appending to DOM so parentElement exists
            attachSliderWheelEvent(slider);

            grid.appendChild(wrapper);
        }

        row.appendChild(grid);
        knowledgeGroupContainer.appendChild(row);
    });
}

function renderGroupAttitude() {
    attitudeGroupContainer.innerHTML = '';
    const isBulk = groupState.attitudeMode === 'bulk';
    const categories = Object.keys(ATTITUDE_DATA);

    // 1. Render Category Selection Bar (Pills)
    const selectionBar = document.createElement('div');
    selectionBar.className = 'checkbox-grid';
    selectionBar.style.marginBottom = '1.5rem';
    selectionBar.style.paddingBottom = '1rem';
    selectionBar.style.borderBottom = '1px solid rgba(99, 102, 241, 0.1)';

    categories.forEach(cat => {
        const label = document.createElement('label');
        label.className = 'pill-checkbox';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = cat;
        input.checked = groupState.includedAttitudeCategories.includes(cat);

        input.onchange = (e) => {
            if (e.target.checked) {
                if (!groupState.includedAttitudeCategories.includes(cat)) {
                    groupState.includedAttitudeCategories.push(cat);
                    // Maintain order based on ATTITUDE_DATA keys
                    groupState.includedAttitudeCategories.sort((a, b) => categories.indexOf(a) - categories.indexOf(b));
                }
            } else {
                groupState.includedAttitudeCategories = groupState.includedAttitudeCategories.filter(c => c !== cat);
            }
            renderGroupAttitude();
        };

        const span = document.createElement('span');
        span.textContent = cat;

        label.appendChild(input);
        label.appendChild(span);
        selectionBar.appendChild(label);
    });
    attitudeGroupContainer.appendChild(selectionBar);

    // 2. Render Active Categories
    for (const [category, items] of Object.entries(ATTITUDE_DATA)) {
        if (!groupState.includedAttitudeCategories.includes(category)) continue;

        const catDiv = document.createElement('div');
        catDiv.className = 'attitude-category';

        const title = document.createElement('h4');
        title.textContent = category;
        catDiv.appendChild(title);

        const grid = document.createElement('div');
        grid.className = `attitude-grid-layout ${isBulk ? 'bulk-mode' : ''}`;

        if (!isBulk) {
            grid.style.gridTemplateColumns = `repeat(${groupState.studentCount}, 1fr)`;
        } else {
            grid.style.gridTemplateColumns = '1fr';
        }

        const loopCount = isBulk ? 1 : groupState.studentCount;

        for (let i = 0; i < loopCount; i++) {
            const studentIndex = i;

            const col = document.createElement('div');
            col.className = 'student-attitude-col';

            if (!isBulk) {
                const lbl = document.createElement('div');
                lbl.className = 'student-label';
                const sName = document.getElementById(`s${i + 1}_name`)?.value || `HS ${i + 1}`;
                lbl.textContent = sName;
                col.appendChild(lbl);
            }

            const pillContainer = document.createElement('div');
            pillContainer.className = 'checkbox-grid';

            items.forEach(tag => {
                const label = document.createElement('label');
                const isPositive = ['tích cực', 'sôi nổi', 'vui vẻ', 'hứng thú', 'tự tin', 'lạc quan', 'tập trung nghe giảng', 'chú ý bài học', 'tích cực phát biểu', 'hòa đồng', 'biết chia sẻ', 'giúp đỡ bạn bè', 'biết nghe lời', 'lễ phép', 'ngoan ngoãn'].includes(tag);
                const isNegative = ['mệt mỏi', 'chán nản', 'trầm tính', 'tự ti', 'xấu hổ', 'ngại nói', 'sao nhãng', 'làm việc riêng', 'không tập trung', 'lơ là', 'nóng nảy', 'chưa hòa đồng', 'chưa vâng lời', 'phải nhắc nhở nhiều'].includes(tag);

                label.className = `pill-checkbox ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`;
                label.style.fontSize = '0.75rem';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.value = tag;

                if (isBulk) {
                    if (groupState.students[0].attitudes.includes(tag)) input.checked = true;
                } else {
                    if (groupState.students[studentIndex].attitudes.includes(tag)) input.checked = true;
                }

                input.onchange = (e) => {
                    const checked = e.target.checked;
                    const val = e.target.value;

                    if (isBulk) {
                        groupState.students.forEach(s => {
                            if (checked) {
                                if (!s.attitudes.includes(val)) s.attitudes.push(val);
                            } else {
                                s.attitudes = s.attitudes.filter(a => a !== val);
                            }
                        });
                    } else {
                        const s = groupState.students[studentIndex];
                        if (checked) {
                            if (!s.attitudes.includes(val)) s.attitudes.push(val);
                        } else {
                            s.attitudes = s.attitudes.filter(a => a !== val);
                        }
                    }
                };

                const span = document.createElement('span');
                span.textContent = tag;
                span.style.padding = '0.2rem 0.6rem';

                label.appendChild(input);
                label.appendChild(span);
                pillContainer.appendChild(label);
            });

            col.appendChild(pillContainer);
            grid.appendChild(col);
        }

        catDiv.appendChild(grid);
        attitudeGroupContainer.appendChild(catDiv);
    }
}

// (Removed static name listeners as they are now dynamic in renderStudentInputs)


// Generate
groupGenerateBtn.addEventListener('click', () => {
    const lessonContent = document.getElementById('groupLessonContent').value.trim();
    if (!lessonContent) {
        alert("Vui lòng nhập nội dung bài học!");
        return;
    }

    // Get Included Criteria from State
    const includedCriteria = groupState.includedCriteria;
    // (Previous DOM query is removed)

    const prompts = [];

    // Generate only for current count
    for (let idx = 0; idx < groupState.studentCount; idx++) {
        const student = groupState.students[idx];
        const name = document.getElementById(`s${idx + 1}_name`)?.value.trim() || `Học sinh ${idx + 1}`;

        // Build Criteria String (Only included)
        let criteriaText = "";
        if (includedCriteria.length > 0) {
            criteriaText = includedCriteria.map(c => `- ${c}: ${student.scores[c]}/10`).join('\n');
        } else {
            criteriaText = "- (Không có nhận xét về kiến thức)";
        }

        // Build Attitude String
        const attitudeText = student.attitudes.length > 0 ? student.attitudes.map(a => `- ${a}`).join('\n') : '- (Không ghi nhận đặc biệt)';

        const prompt = `
### Feedback cho học sinh: ${name}

Hãy đóng vai trò là một giáo viên tiếng Anh nghiêm khắc và chuyên nghiệp. Dựa trên thông tin dưới đây, hãy viết một đoạn nhận xét ngắn gọn, súc tích (khoảng 100-150 chữ) bằng tiếng Việt dành cho phụ huynh.

Thông tin:
- Tên: ${name}
- Bài học: ${lessonContent}

Kết quả (Thang 10):
${criteriaText}

Thái độ:
${attitudeText}

Yêu cầu output (Nghiêm khắc, khách quan, KHÔNG chào hỏi/động viên sáo rỗng, TUYỆT ĐỐI KHÔNG nhắc đến điểm số):
1. **Tiếp thu kiến thức**:
\`\`\`plaintext
[Nội dung nhận xét kiến thức cho ${name}]
\`\`\`

2. **Thái độ học tập**:
\`\`\`plaintext
[Nội dung nhận xét thái độ cho ${name}]
\`\`\`
`.trim();
        prompts.push(prompt);
    }

    groupPromptOutput.textContent = prompts.join('\n\n' + '='.repeat(40) + '\n\n');
    groupOutputSection.classList.remove('hidden');
    groupOutputSection.scrollIntoView({ behavior: 'smooth' });
});

groupCopyBtn.addEventListener('click', () => copyToClipboard(groupPromptOutput, groupCopyBtn));


