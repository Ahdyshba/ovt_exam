function qs(sel, root = document) {
    return root.querySelector(sel);
}

function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
}

function debounce(fn, delay) {
    let t = null;
    return (...args) => {
        
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function toDateInputValue(d) {
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
}

function parseISODateOnly(yyyyMmDd) {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function parseTimeHHMM(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return { h, m };
}

function addHoursToTime(hhmm, hoursToAdd) {
    const { h, m } = parseTimeHHMM(hhmm);
    const totalMin = h * 60 + m + Math.round(hoursToAdd * 60);
    const hh = Math.floor((totalMin % (24 * 60)) / 60);
    const mm = totalMin % 60;
    return `${pad2(hh)}:${pad2(mm)}`;
}

function showAlert(type, message) {
    const host = qs('#alerts');
    if (!host) return;

    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show mb-0`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
        <div>${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;

    host.prepend(el);

    setTimeout(() => {
       
        try {
            const alert = bootstrap.Alert.getOrCreateInstance(el);
            if (alert) alert.close();
        } 
        
        catch (e) {
            el.remove();
        }
    }, 5000);
}

function computeCourseEndDate(dateStart, totalWeeks) {
    const d = parseISODateOnly(dateStart);
    d.setDate(d.getDate() + Math.max(0, totalWeeks - 1) * 7);
    return toDateInputValue(d);
}

function renderPagination(ulEl, totalItems, itemsPerPage, currentPage, onPage) {
    ulEl.innerHTML = '';
    
    const pages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const mkItem = (label, page, disabled, active) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = label;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (disabled) return;
            onPage(page);
        });
        li.appendChild(a);
        return li;
    };

    ulEl.appendChild(mkItem('«', Math.max(1, currentPage - 1), currentPage === 1, false));

    for (let p = 1; p <= pages; p += 1) {
        ulEl.appendChild(mkItem(String(p), p, false, p === currentPage));
    }

    ulEl.appendChild(mkItem('»', Math.min(pages, currentPage + 1), currentPage === pages, false));
}