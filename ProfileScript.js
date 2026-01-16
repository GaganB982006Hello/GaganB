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
            const fadeRate = 400; 
            let progress = scrollY / fadeRate;
            if (progress > 1) progress = 1;
            if (progress < 0) progress = 0;
            leftSide.style.opacity = 1 - progress;
            leftSide.style.width = (30 - (30 * progress)) + '%';
        }
    };

    // --- MAIN SCROLL LISTENER ---
    rightSide.addEventListener('scroll', () => {
        revealOnScroll();
        collapseSidebar();
    });
    
    // Initial call
    revealOnScroll();

    // --- DATA FETCHING ---
    generateLeetCodeBoard(); 
    generateGitHubBoard();   
});

// --- HELPER: Fetch with Robust Proxying ---
async function fetchSafe(url) {
    const proxies = [
        '', // 1. Direct (Fastest)
        'https://corsproxy.io/?', // 2. CORS Proxy (Reliable)
        'https://api.allorigins.win/raw?url=' // 3. AllOrigins (Backup)
    ];

    for (const proxy of proxies) {
        try {
            // Construct URL: If using AllOrigins, we must encode the target URL
            const target = proxy.includes('allorigins') ? encodeURIComponent(url) : url;
            const fullUrl = proxy + target;

            console.log(`Trying: ${fullUrl}`);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 10000); // 10s timeout per try
            
            const res = await fetch(fullUrl, { signal: controller.signal });
            clearTimeout(id);
            
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn(`Failed with ${proxy || 'Direct'}`);
            continue; // Try next proxy
        }
    }
    throw new Error('All connection attempts failed');
}

// --- LEETCODE GENERATOR ---
async function generateLeetCodeBoard() {
    const username = 'gaganb982006'; 
    const gridContainer = document.getElementById('lc-grid');
    const totalDaysEl = document.getElementById('total-days');
    const streakEl = document.getElementById('lc-streak'); 
    const scrollArea = document.getElementById('heatmap-scroll-area');
    const monthContainer = document.getElementById('lc-months');

    try {
        // Use Vercel API (Best for Vercel hosting)
        const data = await fetchSafe(`https://leetcode-api-faisalshohag.vercel.app/${username}`);
        
        const calendarData = data.submissionCalendar;

        if (!calendarData || Object.keys(calendarData).length === 0) {
             throw new Error('Empty calendar data');
        }

        // --- RENDER ---
        const totalActiveDays = Object.keys(calendarData).length;
        if(totalDaysEl) totalDaysEl.innerText = totalActiveDays;
        
        gridContainer.innerHTML = ''; 
        if(monthContainer) monthContainer.innerHTML = '';

        const subMap = new Map();
        Object.keys(calendarData).forEach(ts => {
            const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
            subMap.set(dateStr, calendarData[ts]);
        });

        // Streak Calculation
        let currentStreak = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const sortedKeys = Array.from(subMap.keys()).sort();
        const lastSub = sortedKeys[sortedKeys.length - 1];

        // Check if streak is alive (submitted today or yesterday)
        if (lastSub === todayStr || lastSub === yesterdayStr) {
            currentStreak = 1;
            let checkDate = new Date(lastSub);
            while(true) {
                checkDate.setDate(checkDate.getDate() - 1);
                const prevStr = checkDate.toISOString().split('T')[0];
                if(subMap.has(prevStr)) currentStreak++;
                else break;
            }
        }
        if(streakEl) streakEl.innerText = currentStreak;

        // Grid Render
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
                if(monthContainer) monthContainer.appendChild(label);
            }
        }
        
        setTimeout(() => { if(scrollArea) scrollArea.scrollLeft = scrollArea.scrollWidth; }, 100);

    } catch (e) {
        console.error('LeetCode Failed:', e);
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
        const data = await fetchSafe(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`);
        const contributions = data.contributions; 

        if (!contributions) throw new Error('No GitHub data');

        const total = contributions.reduce((acc, day) => acc + day.count, 0);
        if(totalEl) totalEl.innerText = total;

        let streak = 0;
        const reversed = [...contributions].reverse();
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Handle timezones: if today is 0 but yesterday has data, don't break streak immediately
        if (reversed.length > 0 && reversed[0].date === todayStr && reversed[0].count === 0) {
             reversed.shift(); 
        }

        for (const day of reversed) {
            if (day.count > 0) streak++;
            else break;
        }
        if(streakEl) streakEl.innerText = streak;

        if(gridContainer) gridContainer.innerHTML = '';
        if(monthContainer) monthContainer.innerHTML = '';

        const startDate = contributions.length > 0 ? new Date(contributions[0].date) : new Date();
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

        setTimeout(() => { if(scrollArea) scrollArea.scrollLeft = scrollArea.scrollWidth; }, 100);

    } catch (e) {
        console.error('GitHub Failed:', e);
        if(gridContainer) gridContainer.innerHTML = '<p style="color:#ef4444; padding:10px;">Data unavailable</p>';
    }
}
// --- RESUME MODAL LOGIC ---
function openResume(e) {
    if(e) e.preventDefault(); // Stop the link from jumping to top
    const modal = document.getElementById('resume-modal');
    modal.style.display = 'flex'; // Show modal
    document.body.style.overflow = 'hidden'; // Stop background from scrolling
}

function closeResume(event) {
    // Close if clicking the "X" OR clicking outside the box
    if (event.target.id === 'resume-modal' || event.target.classList.contains('close-modal')) {
        const modal = document.getElementById('resume-modal');
        modal.style.display = 'none'; // Hide modal
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
}
