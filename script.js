document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const promptOutput = document.getElementById('promptOutput');
    const outputSection = document.getElementById('outputSection');
    const themeToggle = document.getElementById('themeToggle');
    const refreshBtn = document.getElementById('refreshBtn');

    // Theme Toggle Logic
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    refreshBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn làm mới tất cả thông tin?')) {
            // 1. Clear Basic Info
            document.getElementById('studentName').value = '';
            document.getElementById('lessonContent').value = '';

            // 2. Reset Knowledge Criteria (Default: check first 3, sliders to 8)
            // Note: Since HTML hardcodes checking "Từ vựng", "Ngữ pháp", "Phát âm", we should respect that or just reset all to 8 and keep current checks?
            // Let's reset to a "clean state": keep check states but reset scores to 8. Or maybe just uncheck everything?
            // Usage flow usually implies starting fresh. Let's reset sliders to 8.
            const criteriaItems = document.querySelectorAll('.criteria-item');
            criteriaItems.forEach(item => {
                const range = item.querySelector('input[type="range"]');
                const output = item.querySelector('output');
                range.value = 8;
                output.textContent = 8;

                // Optional: Reset checkboxes to specific defaults if needed, but maybe leaving them as is or checked is better.
                // Let's just reset checkboxes to checked for common ones if they were unselected? 
                // Simple approach: Don't change checked status, just reset scores. 
                // BETTER: clear everything? "Refresh" implies start over. 
                // Let's reset sliders to 8 and keep checkboxes as is for now to avoid logic complexity vs user intent.
            });

            // 3. Clear Attitude
            const attitudeCheckboxes = document.querySelectorAll('input[name="attitude"]');
            attitudeCheckboxes.forEach(cb => cb.checked = false);

            // 4. Hide Output
            outputSection.classList.add('hidden');
            promptOutput.textContent = '';
        }
    });

    generateBtn.addEventListener('click', generatePrompt);
    copyBtn.addEventListener('click', copyToClipboard);

    function generatePrompt() {
        // 1. Gather Basic Info
        const studentName = document.getElementById('studentName').value.trim();
        const lessonContent = document.getElementById('lessonContent').value.trim();

        if (!studentName || !lessonContent) {
            alert('Vui lòng nhập tên học sinh và nội dung bài học!');
            return;
        }

        // 2. Gather Knowledge Absorption Data
        const knowledgeCriteria = [];
        const criteriaItems = document.querySelectorAll('.criteria-item');

        criteriaItems.forEach(item => {
            const checkbox = item.querySelector('input[name="criteria_include"]');
            if (checkbox.checked) {
                const criteriaName = checkbox.value;
                const score = item.querySelector('input[type="range"]').value;
                knowledgeCriteria.push({ name: criteriaName, score: score });
            }
        });

        // 3. Gather Attitude Data
        const attitudeItems = [];
        const attitudeCheckboxes = document.querySelectorAll('input[name="attitude"]:checked');
        attitudeCheckboxes.forEach(cb => {
            attitudeItems.push(cb.value);
        });

        // 4. Construct the Prompt
        const promptText = `
Hãy đóng vai trò là một giáo viên tiếng Anh tận tâm và chuyên nghiệp. Dựa trên thông tin dưới đây, hãy viết một đoạn nhận xét ngắn gọn, súc tích (khoảng 150-200 chữ) bằng tiếng Việt dành cho phụ huynh của học sinh.

Thông tin học sinh:
- Tên: ${studentName}
- Nội dung bài học: ${lessonContent}

Kết quả học tập (Thang điểm 10):
${knowledgeCriteria.map(k => `- ${k.name}: ${k.score}/10`).join('\n')}

Thái độ học tập:
${attitudeItems.length > 0 ? attitudeItems.map(a => `- ${a}`).join('\n') : '- (Không ghi nhận đặc biệt)'}

Yêu cầu output:
1. Viết thành 2 phần nội dung chính: "Tiếp thu kiến thức" và "Thái độ học tập". Mỗi phần là một đoạn văn liền mạch.
2. Ngôn ngữ: Tiếng Việt, giọng văn khuyến khích, nhẹ nhàng nhưng rõ ràng.
3. Xưng hô: Gọi học sinh là "em" hoặc "${studentName}".
4. KHÔNG liệt kê điểm số cụ thể (ví dụ: không viết "8/10") trong bài nhận xét. Chỉ dùng điểm số để định lượng mức độ khen/góp ý (ví dụ: điểm cao thì khen nắm chắc, điểm thấp thì nhắc nhở cần ôn luyện).
5. Đặt phần "Tiếp thu kiến thức" vào trong một block code markdown.
6. Đặt phần "Thái độ học tập" vào trong một block code markdown riêng biệt thứ hai.
`.trim();

        // 5. Display Result
        promptOutput.textContent = promptText;
        outputSection.classList.remove('hidden');

        // Scroll to output
        outputSection.scrollIntoView({ behavior: 'smooth' });
    }

    function copyToClipboard() {
        const textToCopy = promptOutput.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('primary'); // Visual feedback
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('primary');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Không thể copy. Vui lòng chọn và copy thủ công.');
        });
    }
});
