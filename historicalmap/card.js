export function createCard(event, regionColorConfig, options = {}) {
    const {
        sequentialMode = false,
        moveGhost,
        updateGuideAndLastEvent,
        map,
        locationsData,
        getGuideLine,
        setGuideLine,
        setLastDragEvent,
        dragOffsetRef,
        getGhostCard,
        setGhostCard,
        handleDropAttempt
    } = options;

    const card = document.createElement('div');
    const region = event.region || 'default';
    const colorInfo = regionColorConfig[region] || regionColorConfig.default;
    card.className = `draggable-card p-2 mb-2 mr-2 rounded shadow cursor-pointer border-2`;
    card.style.backgroundColor = colorInfo.bgColor;
    card.style.borderColor = colorInfo.borderColor;
    card.style.color = colorInfo.textColor;
    card.id = event.event_id;
    const year = new Date(event.start_time).getFullYear();

    let imageHTML = '';
    if (event.image) {
        imageHTML = `
            <div class="mt-2">
                <img src="${event.image}" alt="${event.title}" class="w-full h-auto rounded">
                ${event.image_source ? `<div class="text-left text-xs text-gray-500 mt-1">圖片來源：<a href="${event.image_source.url}" target="_blank" rel="noopener noreferrer" class="hover:underline">${event.image_source.name}</a></div>` : ''}
            </div>
        `;
    }

    let linksHTML = '';
    if (event.links && event.links.length > 0) {
        linksHTML += '<div class="mt-2 text-xs space-x-2">';
        event.links.forEach(link => {
            linksHTML += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${link.name}</a>`;
        });
        linksHTML += '</div>';
    }

    card.innerHTML = `<h3 class="font-bold text-sm flex justify-between items-center"><span>${event.title}</span><span class="text-xs text-gray-500 font-normal ml-2">${year}</span></h3><div class="details hidden mt-1">${imageHTML}<p class="text-xs text-gray-600 mt-2">${event.description || ''}</p>${linksHTML}</div>`;

    card.querySelectorAll('a').forEach(link => {
        link.addEventListener('pointerdown', e => e.stopPropagation());
    });

    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };

    card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if ((e.pointerType === 'mouse' && e.button !== 0) || (sequentialMode && card.dataset.draggable !== 'true')) {
            return;
        }
        e.stopPropagation();
        isDragging = false;
        pointerDownPos = { x: e.clientX, y: e.clientY };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp, { once: true });
    }, { passive: false });


    function startDrag(e) {
        isDragging = true;
        const cardRect = card.getBoundingClientRect();
        dragOffsetRef.x = e.clientX - cardRect.left;
        dragOffsetRef.y = e.clientY - cardRect.top;
        const ghost = L.DomUtil.create('div', 'is-dragging', document.body);
        ghost.innerHTML = card.querySelector('h3').outerHTML;
        ghost.style.width = card.offsetWidth + 'px';
        L.DomUtil.setOpacity(card, 0.5);
        setGhostCard(ghost);
        moveGhost(ghost, dragOffsetRef, e);
    }

    function onPointerMove(e) {
        e.preventDefault();
        if (setLastDragEvent) setLastDragEvent({ originalEvent: e }); // <-- 直接加在這裡

        if (!isDragging) {
            const posDiff = Math.sqrt(Math.pow(e.clientX - pointerDownPos.x, 2) + Math.pow(e.clientY - pointerDownPos.y, 2));
            if (posDiff > 5) {
                startDrag(e);
            }
        }
        if (isDragging) {
            moveGhost(getGhostCard(), dragOffsetRef, e);
            updateGuideAndLastEvent({
                map,
                guideLine: getGuideLine(),
                event: e,
                locationsData,
                setGuideLine,
                setLastDragEvent
            });
        }
    }

    function onPointerUp(e) {
        document.removeEventListener('pointermove', onPointerMove);
        map.eachLayer(layer => {
            if (layer.options && layer.options.location_id && layer.getTooltip && layer.getTooltip() && layer.getTooltip().getElement()) {
                layer.getTooltip().getElement().classList.remove('location-tooltip--guide-highlight');
            }
        });
        window._lastGuideTooltipId = null;
        if (isDragging) {
            L.DomUtil.setOpacity(card, 1);
            if (getGuideLine()) { map.removeLayer(getGuideLine()); setGuideLine(null); }
            // 移除 ghostCard
            if (getGhostCard()) { getGhostCard().remove(); setGhostCard(null); }
            handleDropAttempt(card);
            setLastDragEvent(null);
        } else {
            card.querySelector('.details').classList.toggle('hidden');
        }
        isDragging = false;
    }

    return card;
}