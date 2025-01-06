export function getHighResImageFromSvg(dimensions, svgElement, scale = 2) {
  const width = dimensions.width * scale;
  const height = dimensions.height * scale;

  const clonedSvg = svgElement.cloneNode(true);

  clonedSvg.setAttribute('width', width);
  clonedSvg.setAttribute('height', height);

  clonedSvg.childNodes[0].setAttribute('transform', `scale(${scale})`);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svgString
  )}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = svgDataUrl;
  });
}

export function insertDiv({ id, className }, parentContainer) {
  const elem = document.createElement('div');
  elem.id = id;
  elem.className = className;
  parentContainer.insertBefore(elem, parentContainer.childNodes[0]);
  return elem;
}
