import L from 'leaflet';

export const displayMap = (id, locations) => {
  const map = L.map(id);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const greenIcon = L.icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], // Kích thước icon
    iconAnchor: [12, 41], // Điểm neo của icon (giữa chân marker)
    popupAnchor: [1, -34], // Điểm neo của popup
    shadowSize: [41, 41] // Kích thước bóng
  });

  // Thêm các marker cho từng địa điểm
  locations.forEach((location) => {
    L.marker(location.coordinates.reverse(), { icon: greenIcon })
      .addTo(map)
      .bindPopup(location.description)
      .openPopup();
  });

  // Danh sách tọa độ các địa điểm
  let sites = [];
  locations.forEach((val) => {
    sites.push(val.coordinates);
  });

  // Vẽ đường polyline nối các điểm
  L.polyline(sites, { color: '#2ff467ff', weight: 4, opacity: 0.7 }).addTo(map);

  // Tự động điều chỉnh bản đồ để hiển thị toàn bộ tuyến đường
  map.fitBounds(
    L.featureGroup(sites.map((coord) => L.marker(coord))).getBounds()
  );
};
