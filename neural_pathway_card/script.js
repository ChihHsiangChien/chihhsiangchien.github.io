document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const eventListContainer = document.getElementById('event-list');
    const partsBankContainer = document.getElementById('parts-bank');
    const dropZone = document.getElementById('drop-zone');
    const currentMissionTitle = document.getElementById('current-mission-title');
    const currentMissionDesc = document.getElementById('current-mission-desc');
    const checkBtn = document.getElementById('check-btn');
    const resetBtn = document.getElementById('reset-btn');
    const feedbackArea = document.getElementById('feedback-area');

    // State
    let appData = {};
    let currentEvent = null;

    // Data embedded directly to avoid CORS issues when running locally without a server
    // Fetch Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            appData = data;
            initApp();
        })
        .catch(err => {
            console.error('Error loading data:', err);
            // Fallback or alert if running locally without server
            if (window.location.protocol === 'file:') {
                alert('注意：若使用 file:// 協定開啟，無法讀取 data.json。請使用 local server 或參閱說明。');
            }
        });

    function initApp() {
        renderEventList();
        renderPartsBank();
    }

    // Render Sidebar Events
    function renderEventList() {
        eventListContainer.innerHTML = '';
        appData.events.forEach(event => {
            const card = document.createElement('div');
            card.classList.add('event-card');
            card.dataset.id = event.id;
            
            card.innerHTML = `
                <h3>${event.title}</h3>
            `;
            
            card.addEventListener('click', () => selectEvent(event, card));
            eventListContainer.appendChild(card);
        });
    }

    // Render Draggable Parts
    function renderPartsBank() {
        partsBankContainer.innerHTML = '';
        appData.parts.forEach(part => {
            const partEl = createDraggablePart(part);
            partsBankContainer.appendChild(partEl);
        });
    }

    function createDraggablePart(partData) {
        const el = document.createElement('div');
        el.classList.add('part-card');
        
        // Add color coding category class
        if (partData.type) {
            el.classList.add(partData.type);
        }

        el.draggable = true;
        el.dataset.name = partData.name; // Use name for validation
        // User removed icon in previous edit, respecting that
        el.innerHTML = `
            <span class="name">${partData.name}</span>
        `;
        
        el.addEventListener('dragstart', handleDragStart);
        // Important: Create a copy on drag if it's from the bank, but move if it's from the dropzone?
        // Requirement: "Drag different parts". Usually banks allow infinite copies or one-time use. 
        // Let's implement: Bank items are cloned on drag. Drop zone items are moved.
        
        return el;
    }

    // Select Event
    function selectEvent(eventData, cardElement) {
        currentEvent = eventData;
        
        // UI Updates
        document.querySelectorAll('.event-card').forEach(c => c.classList.remove('active'));
        cardElement.classList.add('active');
        
        currentMissionTitle.textContent = eventData.title;
        currentMissionDesc.textContent = eventData.description || '請依據情境排列神經傳導路徑';
        
        resetWorkspace();
    }

    function resetWorkspace() {
        dropZone.innerHTML = '<div class="placeholder-text">請由下方拖曳部件至此排序</div>';
        feedbackArea.classList.add('hidden');
        feedbackArea.className = 'feedback-area hidden';
        feedbackArea.textContent = '';
    }

    // Drag and Drop Logic
    // Using a simple data transfer approach
    
    // Global variable to track what is being dragged
    let draggedSource = null; // 'bank' or 'drop-zone'
    let draggedData = null; // part name
    let draggedElement = null; // actual DOM node if moving

    function handleDragStart(e) {
        draggedElement = e.target;
        draggedData = JSON.stringify({
            name: e.target.dataset.name,
            html: e.target.innerHTML
        });
        
        if (e.target.parentElement.id === 'parts-bank') {
            draggedSource = 'bank';
            e.dataTransfer.effectAllowed = 'copy';
        } else {
            draggedSource = 'drop-zone';
            e.dataTransfer.effectAllowed = 'move';
            // Slight delay to hide element being moved?
        }
        
        e.dataTransfer.setData('text/plain', draggedData);
    }

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // Valid drop targets to REMOVE items from sequence (if dropped back to bank or outside)
    // Actually, simplest is: if dropped on 'drop-zone', it's handled there.
    // If dropped ANYWHERE ELSE, and it came from 'drop-zone', we remove it.
    
    document.addEventListener('dragover', (e) => {
        e.preventDefault(); // allow dropping anywhere to enable the 'drop' event
        // Note: this might interfere with other things, but here it's fine.
    });

    document.addEventListener('drop', (e) => {
        // If the drop happened inside the drop-zone, let the drop-zone handler handle it (it propagates up, or we assume drop-zone stops propagation? Let's check.)
        // Actually, dropZone handler calls e.preventDefault(). 
        // If we click drag and drop outside, this global listener fires.
        
        // However, dropZone drop listener should stop propagation if it handles it.
        // Let's ensure dropZone stops propagation.
        
        if (draggedSource === 'drop-zone' && draggedElement) {
             // If we are here, it means we dropped it somewhere.
             // If it's NOT the drop zone (which we can check by e.target or if dropZone handler consumed it)
             // Let's modify dropZone handler to e.stopPropagation().
             
             // Wait, if I drop on the body, I want to remove it.
             // If I drop on the dropZone, I want to keep/move it.
        }
    });
    
    // Better Pattern:
    // in 'dragend' of the element: check if `dataTransfer.dropEffect` was 'none'? 
    // Browsers are flaky with dropEffect.
    
    // Reliable Pattern:
    // 1. DropZone `drop` handler: handles the move, clears `draggedElement` (or sets a flag `droppedInZone = true`).
    // 2. Global `drop` handler (or `dragend`): if `!droppedInZone` and `source === drop-zone`, remove it.
    
    let droppedInZone = false;

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling so document drop doesn't see it (or just use flag)
        droppedInZone = true;
        dropZone.classList.remove('drag-over');
        
        let data;
        try {
            data = JSON.parse(e.dataTransfer.getData('text/plain'));
        } catch (err) {
            console.warn('Invalid drop data, ignoring:', err);
            return;
        }
        
        // Remove placeholder if it exists
        const placeholder = dropZone.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();

        // Create new element
        const newPart = document.createElement('div');
        newPart.classList.add('part-card');
        
        // Add the color type class if present in data
        if (data.type) {
            newPart.classList.add(data.type);
        }

        newPart.draggable = true;
        newPart.dataset.name = data.name;
        newPart.innerHTML = data.html;
        
        newPart.title = "雙擊移除，或拖曳至外部移除";
        newPart.addEventListener('dblclick', () => {
            newPart.remove();
            checkArrows();
        });
        // Add dragstart for this new item (handling re-drag)
        newPart.addEventListener('dragstart', handleDragStart);

        // Move logic: if source was drop-zone, and we are moving within zone (or re-ordering),
        // The old element is removed in the `dragend` or here?
        // Let's remove old element here to simulate "Move".
        if (draggedSource === 'drop-zone' && draggedElement) {
            draggedElement.remove();
        }

        dropZone.appendChild(newPart);

        checkArrows();
    });

    function handleDragStart(e) {
        draggedElement = e.currentTarget;
        // Check if source is bank or dropzone
        if (draggedElement.closest('.parts-bank')) {
             draggedSource = 'bank';
             e.dataTransfer.effectAllowed = 'copy';
        } else if (draggedElement.closest('.drop-zone')) {
             draggedSource = 'drop-zone';
             e.dataTransfer.effectAllowed = 'move';
        }
        
        // Extract the special type class
        let typeClass = '';
        if (draggedElement.classList.contains('central')) typeClass = 'central';
        else if (draggedElement.classList.contains('neuron')) typeClass = 'neuron';
        else if (draggedElement.classList.contains('terminal')) typeClass = 'terminal';

        draggedData = JSON.stringify({
            name: draggedElement.dataset.name,
            html: draggedElement.innerHTML,
            type: typeClass
        });
        
        e.dataTransfer.setData('text/plain', draggedData);
        droppedInZone = false; // Reset flag
        
        // Determine what to do on dragend
        draggedElement.removeEventListener('dragend', handleDragEnd); 
        draggedElement.addEventListener('dragend', handleDragEnd, { once: true });
    }
    
    function handleDragEnd(e) {
        // If dragged from drop-zone AND NOT dropped in drop-zone (i.e. dropped outside), remove it.
        if (draggedSource === 'drop-zone' && !droppedInZone) {
            // It was dropped outside. Remove it.
            draggedElement.remove();
            checkArrows();
        }
        
        // Reset
        draggedElement = null;
        draggedSource = null;
        droppedInZone = false;
    }
    
    // Add arrow function is same...
    function checkArrows() {
        // Clear all existing arrows
        dropZone.querySelectorAll('.arrow-separator').forEach(el => el.remove());
        
        const items = Array.from(dropZone.querySelectorAll('.part-card'));
        
        if (items.length === 0) {
             if (!dropZone.querySelector('.placeholder-text')) {
                dropZone.innerHTML = '<div class="placeholder-text">請由下方拖曳部件至此排序</div>';
             }
             return;
        }

        // Re-insert items with arrows
        dropZone.innerHTML = '';
        items.forEach((item, index) => {
            dropZone.appendChild(item);
            // Ensure listeners are attached (they stick to element, so it's fine)
            // But if we created new elements earlier, they have listeners.
            
            if (index < items.length - 1) {
                const arrow = document.createElement('span');
                arrow.classList.add('arrow-separator');
                arrow.innerHTML = '&#8594;'; // Right arrow
                dropZone.appendChild(arrow);
            }
        });
    }

    // Check Logic (remains same)
    checkBtn.addEventListener('click', () => {
        if (!currentEvent) {
            alert('請先選擇一個情境！');
            return;
        }

        // Filter out non-card elements just in case (though querySelectorAll matches class)
        const currentCards = Array.from(dropZone.querySelectorAll('.part-card'));
        const userSequence = currentCards.map(c => c.dataset.name);
        
        if (userSequence.length === 0) {
            showFeedback('請先拖曳部件至排列區！', 'error');
            return;
        }

        const correct = currentEvent.correct_sequence;
        
        const isCorrect = JSON.stringify(userSequence) === JSON.stringify(correct);

        if (isCorrect) {
            showFeedback('🎉 答對了！路徑完全正確！', 'success');
        } else {
            let msg = '❌ 順序有誤，再試試看！';
            if (currentEvent.note) {
                msg += `<br><span style="font-size:0.9em; font-weight:normal; margin-top:5px; display:block;">提示：${currentEvent.note}</span>`;
            }
            showFeedback(msg, 'error');
        }
    });

    resetBtn.addEventListener('click', () => {
        if(currentEvent) resetWorkspace();
    });

    function showFeedback(msg, type) {
        feedbackArea.innerHTML = msg;
        feedbackArea.className = `feedback-area ${type}`;
    }
});
