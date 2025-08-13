export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * 產生事件的 popup HTML 內容
 * @param {Object} eventData
 * @returns {string}
 */
export function generatePopupContent(eventData) {
    let popupContent = `<b>${eventData.title}</b>`;
    if (eventData.image) {
        popupContent += `
            <br><img src="${eventData.image}" alt="${eventData.title}" style="width:100%; max-width:200px; margin-top:8px; border-radius:4px;">
            ${eventData.image_source ? `<div style="text-align:left; font-size:0.75rem; color:#666; margin-top:4px;">圖片來源：<a href="${eventData.image_source.url}" target="_blank" rel="noopener noreferrer">${eventData.image_source.name}</a></div>` : ''}
        `;
    }
    if (eventData.description) {
        popupContent += `<br>${eventData.description}`;
    }
    if (eventData.links && eventData.links.length > 0) {
        popupContent += '<div style="margin-top: 8px;">';
        eventData.links.forEach(link => {
            popupContent += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" style="margin-right: 8px;">${link.name}</a>`;
        });
        popupContent += '</div>';
    }
    return popupContent;
}