export function createTable(options = {}) {
    const {
        columns = [],
        data = [],
        sortable = false,
        striped = true,
        bordered = false,
        hover = true,
        className = '',
        onRowClick = null
    } = options;

    const table = document.createElement('table');
    const classes = ['table'];
    
    if (striped) classes.push('table-striped');
    if (bordered) classes.push('table-bordered');
    if (hover) classes.push('table-hover');
    if (className) classes.push(className);
    
    table.className = classes.join(' ');

    if (columns.length > 0) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        columns.forEach((column, index) => {
            const th = document.createElement('th');
            th.textContent = column.title || column.key;
            
            if (column.width) {
                th.style.width = column.width;
            }
            
            if (sortable && column.sortable !== false) {
                th.classList.add('sortable');
                th.style.cursor = 'pointer';
                
                const sortIcon = document.createElement('span');
                sortIcon.className = 'material-symbols-outlined sort-icon';
                sortIcon.textContent = 'unfold_more';
                th.appendChild(sortIcon);
                
                th.addEventListener('click', () => {
                    handleSort(table, index, column.key);
                });
            }
            
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);
    }

    const tbody = document.createElement('tbody');
    
    data.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        if (onRowClick) {
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', () => onRowClick(row, rowIndex));
        }

        columns.forEach(column => {
            const td = document.createElement('td');
            
            if (column.render) {
                const rendered = column.render(row[column.key], row, rowIndex);
                if (typeof rendered === 'string') {
                    td.innerHTML = rendered;
                } else if (rendered instanceof HTMLElement) {
                    td.appendChild(rendered);
                }
            } else {
                td.textContent = row[column.key] || '';
            }
            
            if (column.align) {
                td.style.textAlign = column.align;
            }
            
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
}

function handleSort(table, columnIndex, key) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const th = table.querySelectorAll('th')[columnIndex];
    const sortIcon = th.querySelector('.sort-icon');
    
    let sortDirection = th.dataset.sortDirection || 'none';
    
    table.querySelectorAll('.sort-icon').forEach(icon => {
        icon.textContent = 'unfold_more';
    });
    table.querySelectorAll('th').forEach(header => {
        delete header.dataset.sortDirection;
    });
    
    if (sortDirection === 'none' || sortDirection === 'desc') {
        sortDirection = 'asc';
        sortIcon.textContent = 'keyboard_arrow_up';
    } else {
        sortDirection = 'desc';
        sortIcon.textContent = 'keyboard_arrow_down';
    }
    
    th.dataset.sortDirection = sortDirection;
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
            return sortDirection === 'asc' 
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }
    });
    
    rows.forEach(row => tbody.appendChild(row));
}

export function createUserTable(users = [], options = {}) {
    const columns = [
        {
            key: 'username',
            title: '사용자명',
            render: (value, row) => {
                const container = document.createElement('div');
                container.className = 'user-cell';
                
                const name = document.createElement('span');
                name.textContent = value;
                name.className = 'user-name';
                container.appendChild(name);
                
                if (typeof createVerificationBadge !== 'undefined') {
                    const badge = createVerificationBadge(row.isVerified);
                    container.appendChild(badge);
                }
                
                return container;
            }
        },
        {
            key: 'email',
            title: '이메일',
            sortable: true
        },
        {
            key: 'role',
            title: '역할',
            render: (value) => {
                if (typeof createRoleBadge !== 'undefined') {
                    return createRoleBadge(value);
                }
                return value;
            }
        },
        {
            key: 'joinDate',
            title: '가입일',
            sortable: true,
            render: (value) => {
                return new Date(value).toLocaleDateString('ko-KR');
            }
        },
        {
            key: 'actions',
            title: '작업',
            render: (value, row) => {
                const container = document.createElement('div');
                container.className = 'action-buttons';
                
                if (typeof createButton !== 'undefined') {
                    const editBtn = createButton({
                        text: '편집',
                        variant: 'primary',
                        size: 'small',
                        onClick: () => options.onEdit && options.onEdit(row)
                    });
                    
                    const deleteBtn = createButton({
                        text: '삭제',
                        variant: 'danger',
                        size: 'small',
                        onClick: () => options.onDelete && options.onDelete(row)
                    });
                    
                    container.appendChild(editBtn);
                    container.appendChild(deleteBtn);
                }
                
                return container;
            }
        }
    ];

    return createTable({
        columns,
        data: users,
        sortable: true,
        ...options
    });
}

export function createLogTable(logs = [], options = {}) {
    const columns = [
        {
            key: 'timestamp',
            title: '시간',
            sortable: true,
            render: (value) => {
                return new Date(value).toLocaleString('ko-KR');
            }
        },
        {
            key: 'level',
            title: '레벨',
            render: (value) => {
                const levelColors = {
                    error: 'danger',
                    warn: 'warning',
                    info: 'info',
                    debug: 'secondary'
                };
                
                if (typeof createBadge !== 'undefined') {
                    return createBadge({
                        text: value.toUpperCase(),
                        variant: levelColors[value] || 'secondary',
                        size: 'small'
                    });
                }
                return value;
            }
        },
        {
            key: 'message',
            title: '메시지',
            render: (value) => {
                const div = document.createElement('div');
                div.className = 'log-message';
                div.textContent = value;
                return div;
            }
        },
        {
            key: 'user',
            title: '사용자',
            sortable: true
        },
        {
            key: 'ip',
            title: 'IP 주소',
            sortable: true
        }
    ];

    return createTable({
        columns,
        data: logs,
        sortable: true,
        className: 'log-table',
        ...options
    });
}

export function createPagination(options = {}) {
    const {
        currentPage = 1,
        totalPages = 1,
        totalItems = 0,
        itemsPerPage = 10,
        onPageChange = null
    } = options;

    const container = document.createElement('div');
    container.className = 'pagination-container';

    const info = document.createElement('div');
    info.className = 'pagination-info';
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    info.textContent = `${startItem}-${endItem} / ${totalItems}개 항목`;
    container.appendChild(info);

    const pagination = document.createElement('div');
    pagination.className = 'pagination';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1 && onPageChange) {
            onPageChange(currentPage - 1);
        }
    });
    pagination.appendChild(prevBtn);

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            if (onPageChange) {
                onPageChange(i);
            }
        });
        pagination.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages && onPageChange) {
            onPageChange(currentPage + 1);
        }
    });
    pagination.appendChild(nextBtn);

    container.appendChild(pagination);
    return container;
}

export function createTableContainer(table, pagination = null, className = '') {
    const container = document.createElement('div');
    container.className = `table-container ${className}`;

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    if (pagination) {
        container.appendChild(pagination);
    }

    return container;
}

export function createSearchableTable(options = {}) {
    const { onSearch, ...tableOptions } = options;
    
    const container = document.createElement('div');
    container.className = 'searchable-table';

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = '검색...';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'material-symbols-outlined search-icon';
    searchIcon.textContent = 'search';

    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchInput);

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (onSearch) {
                onSearch(e.target.value);
            }
        }, 300);
    });

    container.appendChild(searchContainer);

    const table = createTable(tableOptions);
    container.appendChild(table);

    return container;
} 