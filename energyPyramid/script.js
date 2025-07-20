function updateTower() {
  const producers = parseInt(document.getElementById('producersInput').value);
  const primaryConsumers = parseInt(document.getElementById('primaryConsumersInput').value);
  const secondaryConsumers = parseInt(document.getElementById('secondaryConsumersInput').value);

  document.getElementById('producersCount').textContent = producers;
  document.getElementById('primaryConsumersCount').textContent = primaryConsumers;
  document.getElementById('secondaryConsumersCount').textContent = secondaryConsumers;

  // 更新各層的高度
  updateTowerHeight(producers, primaryConsumers, secondaryConsumers);

  // 根據能量塔的概念，生產者數量應該最多，其次是初級消費者，最少的是高級消費者
  if (producers >= primaryConsumers * 2 && primaryConsumers >= secondaryConsumers * 2) {
      alert('能量塔穩定');
  } else {
      alert('能量塔不穩定');
  }
}

function updateTowerHeight(producers, primaryConsumers, secondaryConsumers) {
  const totalHeight = 300; // 能量塔總高度
  const total = producers + primaryConsumers + secondaryConsumers;
  
  if (total === 0) {
      document.getElementById('producers').style.height = '0px';
      document.getElementById('primaryConsumers').style.height = '0px';
      document.getElementById('secondaryConsumers').style.height = '0px';
      return;
  }

  const producersHeight = (producers / total) * totalHeight;
  const primaryConsumersHeight = (primaryConsumers / total) * totalHeight;
  const secondaryConsumersHeight = (secondaryConsumers / total) * totalHeight;

  document.getElementById('producers').style.height = producersHeight + 'px';
  document.getElementById('primaryConsumers').style.height = primaryConsumersHeight + 'px';
  document.getElementById('secondaryConsumers').style.height = secondaryConsumersHeight + 'px';
}

setInterval(() => {
  const producers = parseInt(document.getElementById('producersCount').textContent);
  const primaryConsumers = parseInt(document.getElementById('primaryConsumersCount').textContent);
  const secondaryConsumers = parseInt(document.getElementById('secondaryConsumersCount').textContent);

  // 假設每個時間間隔消耗一定數量的生產者和初級消費者
  const newProducers = Math.max(0, producers - Math.ceil(Math.random() * 5));
  const newPrimaryConsumers = Math.max(0, primaryConsumers - Math.ceil(Math.random() * 3));
  const newSecondaryConsumers = Math.max(0, secondaryConsumers - Math.ceil(Math.random() * 1));

  document.getElementById('producersCount').textContent = newProducers;
  document.getElementById('primaryConsumersCount').textContent = newPrimaryConsumers;
  document.getElementById('secondaryConsumersCount').textContent = newSecondaryConsumers;

  updateTowerHeight(newProducers, newPrimaryConsumers, newSecondaryConsumers);

  // 更新顯示
  if (newProducers >= newPrimaryConsumers * 2 && newPrimaryConsumers >= newSecondaryConsumers * 2) {
      console.log('能量塔穩定');
  } else {
      console.log('能量塔不穩定');
  }
}, 5000); // 每5秒更新一次
