document.addEventListener('DOMContentLoaded', () => {
    const reveals = document.querySelectorAll('.reveal');
    
    // --- 1. Reveal on Scroll Animation ---
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const elementVisible = 100;
        reveals.forEach((reveal) => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                reveal.classList.add('active');
                const h2 = reveal.querySelector('h2');
                if(h2) reveal.classList.add('section-visible');
            }
        });
    };

    // --- 2. Collapse Sidebar (Photo Hiding) Animation ---
    const rightSide = document.querySelector('.right-side');
    const leftSide = document.querySelector('.left-side');

    const collapseSidebar = () => {
        // Only run on desktop screens > 900px
        if (window.innerWidth > 900) {
            const scrollY = rightSide.scrollTop;
            const fadeRate = 400; // Adjusts how fast it fades
            let progress = scrollY / fadeRate;
            
            // Clamp progress between 0 and 1
            if (progress > 1) progress = 1;
            if (progress < 0) progress = 0;
            
            // Apply styles
            leftSide.style.opacity = 1 - progress;
            leftSide.style.width = (30 - (30 * progress)) + '%';
        }
    };

    // --- MAIN SCROLL LISTENER ---
    rightSide.addEventListener('scroll', () => {
        revealOnScroll();    // Run reveal animation
        collapseSidebar();   // Run photo hiding animation
    });
    
    // Initial call to set positions
    revealOnScroll();

    // --- DATA FETCHING (Runs once on load) ---
    generateLeetCodeBoard(); 
    generateGitHubBoard();   
});

// --- LEETCODE GENERATOR (With Streak Calculation) ---
// --- LEETCODE GENERATOR ---
async function generateLeetCodeBoard() {
    const username = 'gaganb982006'; 
    
    // --- SETTINGS ---
    // If you used a Streak Freeze, public APIs can't see it. 
    // Set your actual streak number here to override the calculation.
    // Set to null to calculate automatically (e.g. const MANUAL_STREAK = null;)
    const MANUAL_STREAK = null; 
    
    const gridContainer = document.getElementById('lc-grid');
    const monthContainer = document.getElementById('lc-months');
    const totalDaysEl = document.getElementById('total-days');
    const streakEl = document.getElementById('lc-streak'); 
    const scrollArea = document.getElementById('heatmap-scroll-area');

    try {
        const apiEndpoints = [
            `https://alfa-leetcode-api.onrender.com/${username}/calendar`,
            `https://leetcode-stats-api.herokuapp.com/${username}`
        ];
        
        let calendarData = null;
        
        for (const endpoint of apiEndpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(endpoint, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const data = await res.json();
                    if (data.submissionCalendar) {
                        calendarData = typeof data.submissionCalendar === 'string' 
                            ? JSON.parse(data.submissionCalendar) 
                            : data.submissionCalendar;
                        break;
                    }
                }
            } catch (err) { continue; }
        }
        
        if (!calendarData) throw new Error('API Error');

        totalDaysEl.innerText = Object.keys(calendarData).length;
        gridContainer.innerHTML = ''; 

        const subMap = new Map();
        Object.keys(calendarData).forEach(ts => {
            const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
            subMap.set(dateStr, calendarData[ts]);
        });

        // --- STREAK CALCULATION ---
        let currentStreak = 0;
        
        if (MANUAL_STREAK !== null) {
            // Use the manual value if set
            currentStreak = MANUAL_STREAK;
        } else {
            // Calculate automatically
            const todayStr = new Date().toISOString().split('T')[0];
            const yesterday = new Date(); 
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Sort dates to find last submission
            const sortedDates = Array.from(subMap.keys()).sort();
            const lastSubmission = sortedDates[sortedDates.length - 1];

            if (lastSubmission === todayStr || lastSubmission === yesterdayStr) {
                currentStreak = 1;
                let checkDate = new Date(lastSubmission);
                while (true) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    const prevDateStr = checkDate.toISOString().split('T')[0];
                    if (subMap.has(prevDateStr)) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }
        
        if(streakEl) streakEl.innerText = currentStreak;

        // --- RENDER GRID ---
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 365);
        
        const startDayOfWeek = startDate.getDay(); 
        
        for(let i=0; i<startDayOfWeek; i++) {
            const placeholder = document.createElement('div');
            placeholder.classList.add('heatmap-placeholder');
            gridContainer.appendChild(placeholder);
        }

        let currentMonth = -1;
        
        for(let i=0; i<=365; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const count = subMap.get(dateStr) || 0;

            const box = document.createElement('div');
            box.classList.add('heatmap-box');
            if (count > 0) box.classList.add('level-1');
            if (count > 3) box.classList.add('level-2');
            if (count > 6) box.classList.add('level-3');
            if (count > 10) box.classList.add('level-4');
            
            box.title = `${dateStr}: ${count} submissions`;
            box.onclick = () => window.open(`https://leetcode.com/${username}/`, '_blank');
            gridContainer.appendChild(box);

            const colIndex = Math.floor((i + startDayOfWeek) / 7);
            if (d.getDate() === 1 && d.getMonth() !== currentMonth) {
                currentMonth = d.getMonth();
                const monthName = d.toLocaleString('default', { month: 'short' });
                const label = document.createElement('div');
                label.innerText = monthName;
                label.className = 'month-label';
                label.style.left = `${colIndex * 13}px`; 
                monthContainer.appendChild(label);
            }
        }
        
        setTimeout(() => { 
            if(scrollArea) scrollArea.scrollLeft = scrollArea.scrollWidth; 
        }, 100);

    } catch (e) {
        console.error('LeetCode fetch error');
        if(gridContainer) gridContainer.innerHTML = '<p style="color:#ef4444; padding:10px;">Data unavailable</p>';
    }
}
// --- GITHUB ACTIVITY GENERATOR ---
async function generateGitHubBoard() {
    const username = 'GaganB982006Hello'; 
    const gridContainer = document.getElementById('gh-grid');
    const monthContainer = document.getElementById('gh-months');
    const totalEl = document.getElementById('gh-total-contributions');
    const streakEl = document.getElementById('gh-streak');
    const scrollArea = document.getElementById('gh-heatmap-scroll-area');

    try {
        const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`);
        if (!res.ok) throw new Error('GitHub API failed');
        
        const data = await res.json();
        const contributions = data.contributions; 

        if (!contributions) throw new Error('No data');

        const total = contributions.reduce((acc, day) => acc + day.count, 0);
        if(totalEl) totalEl.innerText = total;

        let streak = 0;
        const reversed = [...contributions].reverse();
        // Allow streak if today has 0 but yesterday had activity
        const todayStr = new Date().toISOString().split('T')[0];
        if (reversed[0].date === todayStr && reversed[0].count === 0) {
             reversed.shift(); 
        }

        for (const day of reversed) {
            if (day.count > 0) streak++;
            else break;
        }
        if(streakEl) streakEl.innerText = streak;

        if(gridContainer) gridContainer.innerHTML = '';
        if(monthContainer) monthContainer.innerHTML = '';

        const startDate = new Date(contributions[0].date);
        const startDayOfWeek = startDate.getDay(); 

        for (let i = 0; i < startDayOfWeek; i++) {
            const placeholder = document.createElement('div');
            placeholder.classList.add('heatmap-placeholder');
            if(gridContainer) gridContainer.appendChild(placeholder);
        }

        let currentMonth = -1;

        contributions.forEach((day, index) => {
            const dateObj = new Date(day.date);
            const count = day.count;
            const level = day.level; 

            const box = document.createElement('div');
            box.classList.add('heatmap-box');
            if (count > 0) box.classList.add(`level-${Math.min(level, 4)}`); 
            
            box.title = `${day.date}: ${count} contributions`;
            box.onclick = () => window.open(`https://github.com/${username}`, '_blank');
            if(gridContainer) gridContainer.appendChild(box);

            const colIndex = Math.floor((index + startDayOfWeek) / 7);
            
            if (dateObj.getDate() <= 7 && dateObj.getMonth() !== currentMonth) {
                currentMonth = dateObj.getMonth();
                const monthName = dateObj.toLocaleString('default', { month: 'short' });
                
                const label = document.createElement('div');
                label.innerText = monthName;
                label.className = 'month-label';
                label.style.left = `${colIndex * 13}px`; 
                if(monthContainer) monthContainer.appendChild(label);
            }
        });

        setTimeout(() => { 
            if(scrollArea) scrollArea.scrollLeft = scrollArea.scrollWidth; 
        }, 100);

    } catch (e) {
        console.error('GitHub fetch error');
        if(gridContainer) gridContainer.innerHTML = '<p style="color:#ef4444; padding:10px;">Data unavailable</p>';
    }
}