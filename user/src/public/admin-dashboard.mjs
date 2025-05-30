function showNotice(message, type = 'info') {
    const notice = document.createElement('div');
    notice.style.cssText = `
        background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f47c7c' : '#2196F3'};
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    notice.textContent = message;
    document.querySelector('.notice-container').appendChild(notice);
    
    setTimeout(() => {
        notice.remove();
    }, 3000);
}

async function loadDashboardStats() {
    try {
        const stats = {
            totalUsers: Math.floor(Math.random() * 10000) + 1000,
            newUsers: Math.floor(Math.random() * 50) + 1,
            activeUsers: Math.floor(Math.random() * 500) + 100,
            totalPosts: Math.floor(Math.random() * 50000) + 5000
        };
        
        document.getElementById('total-users').textContent = stats.totalUsers.toLocaleString();
        document.getElementById('new-users').textContent = stats.newUsers.toLocaleString();
        document.getElementById('active-users').textContent = stats.activeUsers.toLocaleString();
        document.getElementById('total-posts').textContent = stats.totalPosts.toLocaleString();
        
    } catch (error) {
        console.error('통계 데이터 로딩 실패:', error);
        showNotice('통계 데이터를 불러오는데 실패했습니다.', 'error');
    }
}

function loadRecentActivity() {
    const activityList = document.getElementById('activity-list');
    
    const activities = [
        { icon: 'person_add', text: '새로운 사용자가 가입했습니다.', time: '5분 전' },
        { icon: 'article', text: '새로운 게시물이 작성되었습니다.', time: '12분 전' },
        { icon: 'login', text: '사용자가 로그인했습니다.', time: '18분 전' },
        { icon: 'edit', text: '게시물이 수정되었습니다.', time: '25분 전' },
        { icon: 'delete', text: '게시물이 삭제되었습니다.', time: '1시간 전' }
    ];
    
    activityList.innerHTML = activities.map(activity => `
        <li class="activity-item">
            <div class="activity-icon">
                <span class="material-symbols-outlined">${activity.icon}</span>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </li>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadRecentActivity();
});

window.showNotice = showNotice;
window.loadRecentActivity = loadRecentActivity; 