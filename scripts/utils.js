document.addEventListener('DOMContentLoaded', () => {

    // --- Theme Toggle Logic ---
    // --- Theme Toggle Logic ---
    const themeCheckbox = document.getElementById('themeToggleCheckbox');

    function applyTheme(isDark) {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeCheckbox) themeCheckbox.checked = true;
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            if (themeCheckbox) themeCheckbox.checked = false;
        }
    }

    // 1. Check for saved user preference
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Initial Apply
    if (savedTheme) {
        applyTheme(savedTheme === 'dark');
    } else {
        applyTheme(true);
    }

    // 2. Listen for System Changes (only if no user preference is saved)
    systemDark.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches);
        }
    });

    // 3. User Manual Toggle
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            applyTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // --- Shared Utilities Initialization ---
    document.querySelectorAll('input[type="range"]').forEach(attachSliderWheelEvent);

    const autoExpandTextareas = document.querySelectorAll('.auto-expand');
    autoExpandTextareas.forEach(textarea => {
        textarea.addEventListener('input', autoResizeTextarea);
        autoResizeTextarea({ target: textarea });
    });

}); // End DOMContentLoaded

// --- Global Utilities ---
function autoResizeTextarea(e) {
    const textarea = e.target;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

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
