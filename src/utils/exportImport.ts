import { GridModel, Point, DataLineConnection, PowerGroup, CustomModule, OverlappedModule, MergedSubGrid } from '../types';
import { GROUP_COLORS, APP_VERSION } from '../constants';
import { getModuleGeometry, getModuleId, getUncoveredSegments, isValidModuleCell } from './geometry';

export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function safeGetXmlText(parent: Element, selector: string, defaultValue = ''): string {
  if (!parent) return defaultValue;
  const elem = parent.querySelector(selector);
  return elem ? elem.textContent || defaultValue : defaultValue;
}

function safeGetXmlInt(parent: Element, selector: string, defaultValue = 0): number {
  const text = safeGetXmlText(parent, selector, String(defaultValue));
  const parsed = parseInt(text, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function exportToXML(grids: Record<string, GridModel>, outputWidth: number, outputHeight: number): void {
  const xml: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  xml.push('<ledflow version="2.0">');
  xml.push(`  <output width="${outputWidth}" height="${outputHeight}"/>`);
  xml.push('  <grids>');

  Object.keys(grids).forEach(gridId => {
    const grid = grids[gridId];
    xml.push(`    <grid id="${gridId}" name="${escapeXml(grid.name)}">`);
    xml.push(`      <settings>`);
    xml.push(`        <cols>${grid.cols}</cols>`);
    xml.push(`        <rows>${grid.rows}</rows>`);
    xml.push(`        <moduleSize>${grid.moduleSize}</moduleSize>`);
    xml.push(`        <moduleWidth>${grid.moduleWidth}</moduleWidth>`);
    xml.push(`        <moduleHeight>${grid.moduleHeight}</moduleHeight>`);
    xml.push(`        <offsetX>${grid.offsetX}</offsetX>`);
    xml.push(`        <offsetY>${grid.offsetY}</offsetY>`);
    xml.push(`        <moduleColor>${grid.moduleColor}</moduleColor>`);
    xml.push(`        <moduleLabelColor>${grid.moduleLabelColor}</moduleLabelColor>`);
    xml.push(`        <moduleLabelSizePercent>${grid.moduleLabelSizePercent}</moduleLabelSizePercent>`);
    xml.push(`        <dataLineFontSizePercent>${grid.dataLineFontSizePercent}</dataLineFontSizePercent>`);
    xml.push(`        <dataLineFont>${escapeXml(grid.dataLineFont)}</dataLineFont>`);
    xml.push(`        <hatchDensity>${grid.hatchDensity}</hatchDensity>`);
    xml.push(`        <connectionFont>${escapeXml(grid.connectionFont)}</connectionFont>`);
    xml.push(`        <connectionFontSize>${grid.connectionFontSize}</connectionFontSize>`);
    xml.push(`        <useDefaultNames>${grid.useDefaultNames}</useDefaultNames>`);
    xml.push(`        <dataLineNamingMode>${grid.dataLineNamingMode || (grid.useDefaultNames ? '1A-1B' : 'none')}</dataLineNamingMode>`);
    xml.push(`        <dataLinePrefix>${escapeXml(grid.dataLinePrefix || '1')}</dataLinePrefix>`);
    xml.push(`        <idType>${grid.idType || 'row.col'}</idType>`);
    xml.push(`        <idFont>${escapeXml(grid.idFont || 'Arial, sans-serif')}</idFont>`);
    xml.push(`        <visible>${grid.visible !== false}</visible>`);
    xml.push(`        <hideOverlapped>${grid.hideOverlapped || false}</hideOverlapped>`);
    xml.push(`      </settings>`);

    if (grid.customModules && grid.customModules.length > 0) {
      xml.push(`      <customModules>`);
      grid.customModules.forEach(module => {
        const anchor = module.anchor || 'top-left';
        const colorAttr = module.color ? ` color="${module.color}"` : '';
        const labelColorAttr = module.labelColor ? ` labelColor="${module.labelColor}"` : '';
        xml.push(`        <module row="${module.row}" col="${module.col}" width="${module.width}" height="${module.height}" anchor="${anchor}"${colorAttr}${labelColorAttr}/>`);
      });
      xml.push(`      </customModules>`);
    }

    if (grid.overlappedModules && grid.overlappedModules.length > 0) {
      xml.push(`      <overlappedModules>`);
      grid.overlappedModules.forEach(module => {
        xml.push(`        <module row="${module.row}" col="${module.col}"/>`);
      });
      xml.push(`      </overlappedModules>`);
    }

    if (grid.mergedSubGrids && grid.mergedSubGrids.length > 0) {
      xml.push(`      <mergedSubGrids>`);
      grid.mergedSubGrids.forEach(sub => {
        const idTypeAttr = sub.idType ? ` idType="${sub.idType}"` : '';
        const idFontAttr = sub.idFont ? ` idFont="${escapeXml(sub.idFont)}"` : '';
        const labelSizeAttr = sub.moduleLabelSizePercent ? ` moduleLabelSizePercent="${sub.moduleLabelSizePercent}"` : '';
        xml.push(`        <subGrid id="${escapeXml(sub.id)}" name="${escapeXml(sub.name)}" color="${sub.color}" labelColor="${sub.labelColor}"${idTypeAttr}${idFontAttr}${labelSizeAttr}>`);
        sub.modules.forEach(m => {
          xml.push(`          <module row="${m.row}" col="${m.col}"/>`);
        });
        xml.push(`        </subGrid>`);
      });
      xml.push(`      </mergedSubGrids>`);
    }

    if (grid.moduleColors && Object.keys(grid.moduleColors).length > 0) {
      xml.push(`      <moduleColors>`);
      for (const [key, color] of Object.entries(grid.moduleColors)) {
        const [r, c] = key.split(',');
        xml.push(`        <color row="${r}" col="${c}" value="${color}"/>`);
      }
      xml.push(`      </moduleColors>`);
    }

    if (grid.moduleIds && Object.keys(grid.moduleIds).length > 0) {
      xml.push(`      <moduleIds>`);
      for (const [key, val] of Object.entries(grid.moduleIds)) {
        const [r, c] = key.split(',');
        xml.push(`        <id row="${r}" col="${c}" value="${escapeXml(val)}"/>`);
      }
      xml.push(`      </moduleIds>`);
    }

    xml.push(`      <gridState>`);
    for (let row = 0; row < grid.rows; row++) {
      const rowData = grid.gridState[row].map(v => v ? '1' : '0').join('');
      xml.push(`        <row>${rowData}</row>`);
    }
    xml.push(`      </gridState>`);

    xml.push(`      <dataLines>`);
    grid.connections.forEach((conn, index) => {
      const colorIndex = conn.colorIndex !== undefined ? conn.colorIndex : index;
      const prefixAttr = conn.prefix !== undefined ? ` prefix="${escapeXml(conn.prefix)}"` : '';
      xml.push(`        <line index="${index}" colorIndex="${colorIndex}" color="${conn.color}" name="${escapeXml(conn.name || '')}" endName="${escapeXml(conn.endName || '')}"${prefixAttr}>`);
      conn.points.forEach(point => {
        xml.push(`          <point row="${point.row}" col="${point.col}"/>`);
      });
      xml.push(`        </line>`);
    });
    xml.push(`      </dataLines>`);

    xml.push(`      <powerGroups>`);
    grid.selectedGroups.forEach((group) => {
      xml.push(`        <group index="${group.index}" colorIndex="${group.colorIndex}">`);
      group.modules.forEach(module => {
        xml.push(`          <module row="${module.row}" col="${module.col}"/>`);
      });
      xml.push(`        </group>`);
    });
    xml.push(`      </powerGroups>`);

    xml.push(`    </grid>`);
  });

  xml.push('  </grids>');
  xml.push('</ledflow>');

  const blob = new Blob([xml.join('\n')], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ledflow_project.xml';
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPNG(canvas: HTMLCanvasElement, outputWidth: number, outputHeight: number): void {
  const link = document.createElement('a');
  link.download = `output_${outputWidth}x${outputHeight}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function generateSVGString(
  grids: Record<string, GridModel>,
  outputWidth: number,
  outputHeight: number,
  altLineStyle = true,
  includeCanvasBorder = true
): string {
  const svg: string[] = [];
  svg.push('<?xml version="1.0" encoding="UTF-8"?>');
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}">`);
  svg.push('  <title>LedFlow Export</title>');
  svg.push(`  <desc>Created with LedFlow v${APP_VERSION}</desc>`);
  if (includeCanvasBorder) {
    svg.push('  <!-- Output Border -->');
    svg.push(`  <rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="none" stroke="#555555" stroke-width="2"/>`);
  }

  Object.entries(grids).forEach(([gridId, grid]) => {
    if (!grid.visible) return;
    svg.push('');
    svg.push(`  <!-- Grid: ${grid.name} (${grid.cols}x${grid.rows}) -->`);
    svg.push(`  <g id="${gridId}" data-grid-name="${escapeXml(grid.name)}">`);

    if (grid.offsetX !== 0 || grid.offsetY !== 0) {
      svg.push(`    <g transform="translate(${grid.offsetX}, ${grid.offsetY})">`);
    }

    svg.push('      <!-- Modules -->');
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (isValidModuleCell(grid, row, col) && grid.gridState[row] && grid.gridState[row][col]) {
          const geom = getModuleGeometry(grid, row, col);
          const moduleId = getModuleId(grid, row, col);
          const customMod = grid.customModules?.find((cm) => cm.row === row && cm.col === col);
          const subGrid = grid.mergedSubGrids?.find((s) => s.modules.some((m) => m.row === row && m.col === col));
          const modColor = subGrid?.color || grid.moduleColors?.[`${row},${col}`] || customMod?.color || grid.moduleColor;
          const modLabelColor = subGrid?.labelColor || customMod?.labelColor || grid.moduleLabelColor;
          svg.push(`      <rect x="${geom.x}" y="${geom.y}" width="${geom.width}" height="${geom.height}" fill="${modColor}" stroke="${modLabelColor}" stroke-width="1"/>`);

          const labelSizePercent = subGrid?.moduleLabelSizePercent ?? grid.moduleLabelSizePercent;
          const idFont = subGrid?.idFont || grid.idFont || 'Arial, sans-serif';
          const cleanFontFamily = idFont.replace(/['"]/g, '');
          const isPixelFont = idFont.includes('VT323');
          const fontSizeMultiplier = isPixelFont ? 1.25 : 1.0;
          const fontSize = Math.max(8, Math.round(Math.min(geom.width, geom.height) * (labelSizePercent / 100) * fontSizeMultiplier));
          const textX = geom.x + 10;
          const textY = geom.y + 10 + fontSize * 0.8;
          svg.push(`      <text x="${textX}" y="${textY}" font-family="${cleanFontFamily}" font-size="${fontSize}" fill="${modLabelColor}" text-anchor="start">${moduleId}</text>`);
        }
      }
    }

    if (grid.connections.length > 0) {
      svg.push('      <!-- Data Lines -->');
      const patterns: string[] = [];
      const patternRects: { x: number; y: number; moduleWidth: number; moduleHeight: number; patternId: string }[] = [];

      if (!altLineStyle) {
        grid.connections.forEach((conn, index) => {
          if (conn.points && conn.points.length > 0) {
            const step = 20 - grid.hatchDensity;
            const lineIndex = conn.colorIndex !== undefined ? conn.colorIndex : index;
            const isForwardSlash = lineIndex % 2 === 0;

            conn.points.forEach(point => {
              if (!grid.gridState[point.row] || !grid.gridState[point.row][point.col]) return;
              const geom = getModuleGeometry(grid, point.row, point.col);
              const patternId = `hatch-${gridId}-${index}-${point.row}-${point.col}`;

              patterns.push(`        <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${step}" height="${step}">`);
              if (isForwardSlash) {
                patterns.push(`          <line x1="0" y1="0" x2="${step}" y2="${step}" stroke="${conn.color}" stroke-width="2" opacity="0.5"/>`);
              } else {
                patterns.push(`          <line x1="0" y1="${step}" x2="${step}" y2="0" stroke="${conn.color}" stroke-width="2" opacity="0.5"/>`);
              }
              patterns.push(`        </pattern>`);

              patternRects.push({ x: geom.x, y: geom.y, moduleWidth: geom.width, moduleHeight: geom.height, patternId });
            });
          }
        });

        if (patterns.length > 0) {
          svg.push(`      <defs>`);
          patterns.forEach(pattern => svg.push(pattern));
          svg.push(`      </defs>`);
        }

        patternRects.forEach(rect => {
          svg.push(`      <rect x="${rect.x}" y="${rect.y}" width="${rect.moduleWidth}" height="${rect.moduleHeight}" fill="url(#${rect.patternId})"/>`);
        });
      }

      grid.connections.forEach((conn) => {
        if (conn.points && conn.points.length > 0) {
          const visiblePoints = conn.points.filter(point =>
            !grid.overlappedModules.some(m => m.row === point.row && m.col === point.col) &&
            grid.gridState[point.row] && grid.gridState[point.row][point.col]
          );

          const lineColor = conn.color || '#000000';

          if (altLineStyle && visiblePoints.length >= 1) {
            const firstPoint = visiblePoints[0];
            const geom = getModuleGeometry(grid, firstPoint.row, firstPoint.col);
            const dotRadius = Math.max(3, Math.min(geom.width, geom.height) * 0.06);
            svg.push(`      <circle cx="${geom.centerX}" cy="${geom.centerY}" r="${dotRadius}" fill="${lineColor}"/>`);
          }

          if (visiblePoints.length >= 2) {
            const lineWidth = Math.max(3, grid.moduleWidth / 30);
            let pathData = '';
            visiblePoints.forEach((point, i) => {
              const geom = getModuleGeometry(grid, point.row, point.col);
              const px = geom.centerX;
              const py = geom.centerY;
              if (i === 0) {
                pathData += `M ${px} ${py}`;
              } else {
                pathData += ` L ${px} ${py}`;
              }
            });
            svg.push(`      <path d="${pathData}" fill="none" stroke="${lineColor}" stroke-width="${lineWidth}"/>`);

            const last = visiblePoints[visiblePoints.length - 1];
            const secondLast = visiblePoints[visiblePoints.length - 2];
            const geom1 = getModuleGeometry(grid, secondLast.row, secondLast.col);
            const geom2 = getModuleGeometry(grid, last.row, last.col);

            const x1 = geom1.centerX;
            const y1 = geom1.centerY;
            const x2 = geom2.centerX;
            const y2 = geom2.centerY;

            const angle = Math.atan2(y2 - y1, x2 - x1);
            const headLength = 40;
            const headWidth = 20;

            const arrowPoints = [
              [x2, y2],
              [x2 - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
               y2 - headLength * Math.sin(angle) + headWidth * Math.cos(angle)],
              [x2 - headLength * Math.cos(angle),
               y2 - headLength * Math.sin(angle)]
            ];
            svg.push(`      <polygon points="${arrowPoints.map(p => p.join(',')).join(' ')}" fill="${lineColor}"/>`);
          }

          if (conn.points.length === 1) {
            if (conn.name || conn.endName) {
              const first = conn.points[0];
              const geom = getModuleGeometry(grid, first.row, first.col);
              const minSide = Math.min(geom.width, geom.height);
              const dataLineFontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));
              const labelX = geom.centerX;
              const labelY = geom.centerY;
              let labelText = '';
              if (conn.name && conn.endName) {
                labelText = `${conn.name}-${conn.endName}`;
              } else if (conn.name) {
                labelText = conn.name;
              } else if (conn.endName) {
                labelText = conn.endName;
              }
              svg.push(`      <text x="${labelX}" y="${labelY}" dy="0.35em" font-family="${grid.dataLineFont}" font-size="${dataLineFontSize}" font-weight="bold" fill="#000000" text-anchor="middle">${escapeXml(labelText)}</text>`);
            }
          } else {
            if (conn.name && conn.points.length > 0) {
              const first = conn.points[0];
              const geom = getModuleGeometry(grid, first.row, first.col);
              const minSide = Math.min(geom.width, geom.height);
              const dataLineFontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));

              let labelX = geom.centerX;
              let labelY = geom.centerY;

              if (conn.points.length > 1) {
                const second = conn.points[1];
                if (second.col > first.col) {
                  labelX = geom.x + geom.width / 4;
                  labelY = geom.y + 3 * geom.height / 4;
                } else if (second.col < first.col) {
                  labelX = geom.x + 3 * geom.width / 4;
                  labelY = geom.y + geom.height / 4;
                } else if (second.row > first.row) {
                  labelX = geom.x + 3 * geom.width / 4;
                  labelY = geom.y + geom.height / 4;
                } else if (second.row < first.row) {
                  labelX = geom.x + geom.width / 4;
                  labelY = geom.y + 3 * geom.height / 4;
                }
              }

              svg.push(`      <text x="${labelX}" y="${labelY}" dy="0.35em" font-family="${grid.dataLineFont}" font-size="${dataLineFontSize}" font-weight="bold" fill="#000000" text-anchor="middle">${escapeXml(conn.name)}</text>`);
            }

            if (conn.endName && conn.points.length > 0) {
              const last = conn.points[conn.points.length - 1];
              const geom = getModuleGeometry(grid, last.row, last.col);
              const minSide = Math.min(geom.width, geom.height);
              const dataLineFontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));

              let labelX = geom.centerX;
              let labelY = geom.centerY;

              if (conn.points.length > 1) {
                const secondLast = conn.points[conn.points.length - 2];
                if (secondLast.col > last.col || secondLast.row < last.row) {
                  labelX = geom.x + geom.width / 4;
                  labelY = geom.y + 3 * geom.height / 4;
                } else if (secondLast.col < last.col || secondLast.row > last.row) {
                  labelX = geom.x + 3 * geom.width / 4;
                  labelY = geom.y + geom.height / 4;
                }
              }

              svg.push(`      <text x="${labelX}" y="${labelY}" dy="0.35em" font-family="${grid.dataLineFont}" font-size="${dataLineFontSize}" font-weight="bold" fill="#000000" text-anchor="middle">${escapeXml(conn.endName)}</text>`);
            }
          }
        }
      });
    }

    if (grid.selectedGroups.length > 0) {
      svg.push('      <!-- Power Groups -->');
      if (altLineStyle) {
        const powerPatterns: string[] = [];
        const powerPatternRects: { x: number; y: number; moduleWidth: number; moduleHeight: number; patternId: string }[] = [];

        grid.selectedGroups.forEach((group, groupIndex) => {
          if (group.modules && group.modules.length > 0) {
            const groupColor = GROUP_COLORS[(group.colorIndex - 1) % GROUP_COLORS.length] || '#808080';
            const step = 20 - (grid.hatchDensity || 6);
            const isForwardSlash = (group.colorIndex ?? groupIndex) % 2 === 0;
            const tolerance = 0.5;

            const activeMods = group.modules.filter(m => grid.gridState[m.row] && grid.gridState[m.row][m.col]);

            activeMods.forEach(module => {
              const geom = getModuleGeometry(grid, module.row, module.col);
              const x = geom.x;
              const y = geom.y;
              const moduleWidth = geom.width;
              const moduleHeight = geom.height;
              const maxX = x + moduleWidth;
              const maxY = y + moduleHeight;

              // Top
              const topSegments: { start: number; end: number }[] = [];
              activeMods.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  const otherMaxY = otherGeom.y + otherGeom.height;
                  if (Math.abs(otherMaxY - y) < tolerance) {
                    const overlapLeft = Math.max(x, otherGeom.x);
                    const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                    if (overlapLeft < overlapRight) {
                      topSegments.push({ start: overlapLeft, end: overlapRight });
                    }
                  }
                }
              });
              const uncoveredTop = getUncoveredSegments(x, maxX, topSegments);

              // Bottom
              const bottomSegments: { start: number; end: number }[] = [];
              activeMods.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  if (Math.abs(otherGeom.y - maxY) < tolerance) {
                    const overlapLeft = Math.max(x, otherGeom.x);
                    const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                    if (overlapLeft < overlapRight) {
                      bottomSegments.push({ start: overlapLeft, end: overlapRight });
                    }
                  }
                }
              });
              const uncoveredBottom = getUncoveredSegments(x, maxX, bottomSegments);

              // Left
              const leftSegments: { start: number; end: number }[] = [];
              activeMods.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  const otherMaxX = otherGeom.x + otherGeom.width;
                  if (Math.abs(otherMaxX - x) < tolerance) {
                    const overlapTop = Math.max(y, otherGeom.y);
                    const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                    if (overlapTop < overlapBottom) {
                      leftSegments.push({ start: overlapTop, end: overlapBottom });
                    }
                  }
                }
              });
              const uncoveredLeft = getUncoveredSegments(y, maxY, leftSegments);

              // Right
              const rightSegments: { start: number; end: number }[] = [];
              activeMods.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  if (Math.abs(otherGeom.x - maxX) < tolerance) {
                    const overlapTop = Math.max(y, otherGeom.y);
                    const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                    if (overlapTop < overlapBottom) {
                      rightSegments.push({ start: overlapTop, end: overlapBottom });
                    }
                  }
                }
              });
              const uncoveredRight = getUncoveredSegments(y, maxY, rightSegments);

              const minSide = Math.min(moduleWidth, moduleHeight);
              const perimeterInset = Math.ceil((minSide * 6) / 100);

              const insetTop = uncoveredTop.length > 0 ? perimeterInset : 0;
              const insetBottom = uncoveredBottom.length > 0 ? perimeterInset : 0;
              const insetLeft = uncoveredLeft.length > 0 ? perimeterInset : 0;
              const insetRight = uncoveredRight.length > 0 ? perimeterInset : 0;

              const rectX = x + insetLeft;
              const rectY = y + insetTop;
              const rectW = moduleWidth - insetLeft - insetRight;
              const rectH = moduleHeight - insetTop - insetBottom;

              if (rectW > 0 && rectH > 0) {
                const patternId = `powerhatch-${gridId}-${groupIndex}-${module.row}-${module.col}`;

                powerPatterns.push(`        <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${step}" height="${step}">`);
                if (isForwardSlash) {
                  powerPatterns.push(`          <line x1="0" y1="0" x2="${step}" y2="${step}" stroke="${groupColor}" stroke-width="2.5" opacity="0.7"/>`);
                } else {
                  powerPatterns.push(`          <line x1="0" y1="${step}" x2="${step}" y2="0" stroke="${groupColor}" stroke-width="2.5" opacity="0.7"/>`);
                }
                powerPatterns.push(`        </pattern>`);

                powerPatternRects.push({ x: rectX, y: rectY, moduleWidth: rectW, moduleHeight: rectH, patternId });
              }
            });
          }
        });

        if (powerPatterns.length > 0) {
          svg.push(`      <defs>`);
          powerPatterns.forEach(pattern => svg.push(pattern));
          svg.push(`      </defs>`);
        }

        powerPatternRects.forEach(rect => {
          svg.push(`      <rect x="${rect.x}" y="${rect.y}" width="${rect.moduleWidth}" height="${rect.moduleHeight}" fill="url(#${rect.patternId})"/>`);
        });
      } else {
        grid.selectedGroups.forEach((group) => {
          if (group.modules && group.modules.length > 0) {
            const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
            const offset = 4.5;
            const tolerance = 0.5;

            group.modules.forEach(module => {
              const geom = getModuleGeometry(grid, module.row, module.col);
              const x = geom.x;
              const y = geom.y;
              const moduleWidth = geom.width;
              const moduleHeight = geom.height;
              const maxX = x + moduleWidth;
              const maxY = y + moduleHeight;

              // Top
              const topSegments: { start: number; end: number }[] = [];
              group.modules.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  const otherMaxY = otherGeom.y + otherGeom.height;
                  if (Math.abs(otherMaxY - y) < tolerance) {
                    const overlapLeft = Math.max(x, otherGeom.x);
                    const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                    if (overlapLeft < overlapRight) {
                      topSegments.push({ start: overlapLeft, end: overlapRight });
                    }
                  }
                }
              });
              const uncoveredTop = getUncoveredSegments(x, maxX, topSegments);
              uncoveredTop.forEach(segment => {
                edges.push({ x1: segment.start + offset, y1: y + offset, x2: segment.end - offset, y2: y + offset });
              });

              // Bottom
              const bottomSegments: { start: number; end: number }[] = [];
              group.modules.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  if (Math.abs(otherGeom.y - maxY) < tolerance) {
                    const overlapLeft = Math.max(x, otherGeom.x);
                    const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                    if (overlapLeft < overlapRight) {
                      bottomSegments.push({ start: overlapLeft, end: overlapRight });
                    }
                  }
                }
              });
              const uncoveredBottom = getUncoveredSegments(x, maxX, bottomSegments);
              uncoveredBottom.forEach(segment => {
                edges.push({ x1: segment.start + offset, y1: y + moduleHeight - offset, x2: segment.end - offset, y2: y + moduleHeight - offset });
              });

              // Left
              const leftSegments: { start: number; end: number }[] = [];
              group.modules.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  const otherMaxX = otherGeom.x + otherGeom.width;
                  if (Math.abs(otherMaxX - x) < tolerance) {
                    const overlapTop = Math.max(y, otherGeom.y);
                    const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                    if (overlapTop < overlapBottom) {
                      leftSegments.push({ start: overlapTop, end: overlapBottom });
                    }
                  }
                }
              });
              const uncoveredLeft = getUncoveredSegments(y, maxY, leftSegments);
              uncoveredLeft.forEach(segment => {
                edges.push({ x1: x + offset, y1: segment.start + offset, x2: x + offset, y2: segment.end - offset });
              });

              // Right
              const rightSegments: { start: number; end: number }[] = [];
              group.modules.forEach(other => {
                if (other.row !== module.row || other.col !== module.col) {
                  const otherGeom = getModuleGeometry(grid, other.row, other.col);
                  if (Math.abs(otherGeom.x - maxX) < tolerance) {
                    const overlapTop = Math.max(y, otherGeom.y);
                    const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                    if (overlapTop < overlapBottom) {
                      rightSegments.push({ start: overlapTop, end: overlapBottom });
                    }
                  }
                }
              });
              const uncoveredRight = getUncoveredSegments(y, maxY, rightSegments);
              uncoveredRight.forEach(segment => {
                edges.push({ x1: x + moduleWidth - offset, y1: segment.start + offset, x2: x + moduleWidth - offset, y2: segment.end - offset });
              });
            });

            const color = GROUP_COLORS[(group.colorIndex - 1) % GROUP_COLORS.length];
            edges.forEach((edge) => {
              svg.push(`      <line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" stroke="${color}" stroke-width="9" stroke-dasharray="22.5,10" stroke-linecap="butt"/>`);
            });
          }
        });
      }
    }

    if (grid.offsetX !== 0 || grid.offsetY !== 0) {
      svg.push('    </g>');
    }
    svg.push('  </g>');
  });

  svg.push('</svg>');
  return svg.join('\n');
}

export function exportToSVG(
  grids: Record<string, GridModel>,
  outputWidth: number,
  outputHeight: number,
  altLineStyle = true
): void {
  const svgContent = generateSVGString(grids, outputWidth, outputHeight, altLineStyle);
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ledflow_export.svg';
  link.click();
  URL.revokeObjectURL(url);
}

export interface PdfExportOptions {
  orientation?: 'landscape' | 'portrait';
  format?: 'a4' | 'a3' | 'letter' | 'auto';
  includeSummary?: boolean;
  includeCanvasBorder?: boolean;
  altLineStyle?: boolean;
}

export async function exportToPDF(
  grids: Record<string, GridModel>,
  outputWidth: number,
  outputHeight: number,
  optionsOrAltLineStyle: PdfExportOptions | boolean = true
): Promise<void> {
  let options: PdfExportOptions = {};
  if (typeof optionsOrAltLineStyle === 'boolean') {
    options = { altLineStyle: optionsOrAltLineStyle };
  } else {
    options = optionsOrAltLineStyle;
  }

  const altLineStyle = options.altLineStyle ?? true;
  const includeCanvasBorder = options.includeCanvasBorder ?? true;
  const orientation = options.orientation || (outputWidth >= outputHeight ? 'landscape' : 'portrait');
  const format = options.format || 'a4';
  const includeSummary = options.includeSummary ?? true;

  const svgContent = generateSVGString(grids, outputWidth, outputHeight, altLineStyle, includeCanvasBorder);
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = svgDoc.documentElement as unknown as SVGElement;

  const { jsPDF } = await import('jspdf');
  const { svg2pdf } = await import('svg2pdf.js');

  let pdfFormat: string | [number, number] = format;
  if (format === 'auto') {
    if (orientation === 'landscape') {
      pdfFormat = [Math.max(outputWidth, outputHeight), Math.min(outputWidth, outputHeight)];
    } else {
      pdfFormat = [Math.min(outputWidth, outputHeight), Math.max(outputWidth, outputHeight)];
    }
  }

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: pdfFormat
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Clean white canvas background for PDF
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  const margin = 24;
  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2;

  // Prepare summary items (excluding output dimensions and not connected count)
  let gridEntries = Object.entries(grids).filter(([_, g]) => g.visible !== false);
  if (gridEntries.length === 0) {
    gridEntries = Object.entries(grids);
  }
  const totalGridsCount = gridEntries.length;

  const summaryItems = gridEntries.map(([_, grid]) => {
    const dataLinesCount = grid.connections.length;
    const powerLinesCount = grid.selectedGroups.length;

    let totalDataLineCabinets = 0;
    grid.connections.forEach((conn) => {
      conn.points.forEach((point) => {
        if (grid.gridState[point.row] && grid.gridState[point.row][point.col]) {
          totalDataLineCabinets++;
        }
      });
    });

    let totalPowerGroupCabinets = 0;
    grid.selectedGroups.forEach((group) => {
      group.modules.forEach((module) => {
        if (grid.gridState[module.row] && grid.gridState[module.row][module.col]) {
          totalPowerGroupCabinets++;
        }
      });
    });

    const avgDataLine = dataLinesCount > 0 ? (totalDataLineCabinets / dataLinesCount).toFixed(1) : '0';
    const avgPowerGroup = powerLinesCount > 0 ? (totalPowerGroupCabinets / powerLinesCount).toFixed(1) : '0';

    return {
      name: grid.name,
      cols: grid.cols,
      rows: grid.rows,
      dataLinesCount,
      avgDataLine,
      powerLinesCount,
      avgPowerGroup
    };
  });

  if (!includeSummary || summaryItems.length === 0) {
    // Fit diagram to full available space
    const scale = Math.min(availW / outputWidth, availH / outputHeight);
    const diagW = outputWidth * scale;
    const diagH = outputHeight * scale;
    const diagX = margin + (availW - diagW) / 2;
    const diagY = margin + (availH - diagH) / 2;

    await svg2pdf(svgElement, doc, {
      x: diagX,
      y: diagY,
      width: diagW,
      height: diagH
    });
  } else {
    // Determine optimal layout: Side-by-Side vs Top-and-Bottom
    const N = summaryItems.length;

    // Bottom layout calculation
    const colCount_bottom = orientation === 'landscape'
      ? (N <= 4 ? N : (N <= 8 ? 4 : (N <= 12 ? 4 : Math.min(6, N))))
      : (N <= 3 ? N : (N <= 6 ? 3 : 4));
    const rowCount_bottom = Math.ceil(N / Math.max(1, colCount_bottom));
    const cardH_bottom = 34;
    const rowGap_bottom = 6;
    const summaryH_bottom = 32 + rowCount_bottom * (cardH_bottom + rowGap_bottom) + 8;
    const gap_bottom = 12;
    const diagAreaW_bottom = availW;
    const diagAreaH_bottom = Math.max(80, availH - summaryH_bottom - gap_bottom);
    const scale_bottom = Math.min(diagAreaW_bottom / outputWidth, diagAreaH_bottom / outputHeight);

    // Side layout calculation (mainly suitable for landscape)
    const colsSide = N <= 7 ? 1 : 2;
    const rowsSide = Math.ceil(N / colsSide);
    const summaryW_side = colsSide === 1 ? Math.min(210, availW * 0.32) : Math.min(360, availW * 0.44);
    const gap_side = 14;
    const diagAreaW_side = Math.max(80, availW - summaryW_side - gap_side);
    const diagAreaH_side = availH;
    const scale_side = Math.min(diagAreaW_side / outputWidth, diagAreaH_side / outputHeight);

    // If landscape and side scale is better or equal, use side layout
    const useSideLayout = orientation === 'landscape' && scale_side >= scale_bottom && rowsSide * 34 + 40 <= availH;

    if (useSideLayout) {
      // Side-by-Side: Diagram on Left, Summary on Right
      const diagW = outputWidth * scale_side;
      const diagH = outputHeight * scale_side;
      const diagX = margin + (diagAreaW_side - diagW) / 2;
      const diagY = margin + (diagAreaH_side - diagH) / 2;

      await svg2pdf(svgElement, doc, {
        x: diagX,
        y: diagY,
        width: diagW,
        height: diagH
      });

      // Draw Summary Card on the Right
      const sumX = margin + diagAreaW_side + gap_side;
      const sumY = margin;
      const sumW = summaryW_side;
      const sumH = availH;

      drawPdfSummary(doc, sumX, sumY, sumW, sumH, totalGridsCount, summaryItems, 'side', colsSide);
    } else {
      // Top-and-Bottom: Diagram on Top, Summary on Bottom
      const diagW = outputWidth * scale_bottom;
      const diagH = outputHeight * scale_bottom;
      const diagX = margin + (diagAreaW_bottom - diagW) / 2;
      const diagY = margin + (diagAreaH_bottom - diagH) / 2;

      await svg2pdf(svgElement, doc, {
        x: diagX,
        y: diagY,
        width: diagW,
        height: diagH
      });

      // Draw Summary Card at the Bottom
      const sumX = margin;
      const sumY = margin + diagAreaH_bottom + gap_bottom;
      const sumW = availW;
      const sumH = summaryH_bottom;

      drawPdfSummary(doc, sumX, sumY, sumW, sumH, totalGridsCount, summaryItems, 'bottom', colCount_bottom);
    }
  }

  doc.save(`ledflow_export_${outputWidth}x${outputHeight}.pdf`);
}

function drawPdfSummary(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  totalGrids: number,
  items: Array<{
    name: string;
    cols: number;
    rows: number;
    dataLinesCount: number;
    avgDataLine: string;
    powerLinesCount: number;
    avgPowerGroup: string;
  }>,
  layoutType: 'side' | 'bottom',
  columnsCount: number = 1
) {
  // Card container on white page
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(1);
  doc.roundedRect(x, y, width, height, 6, 6, 'FD');

  // Header accent bar & title
  doc.setFillColor(2, 132, 199); // sky-600
  doc.roundedRect(x + 10, y + 9, 3.5, 11, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('SUMMARY', x + 18, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Total LEDs: ${totalGrids}`, x + width - 12, y + 18, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(x + 10, y + 24, x + width - 10, y + 24);

  const contentY = y + 30;
  const colCount = Math.max(1, columnsCount);
  const colGap = 8;
  const sidePadding = 10;
  const colWidth = (width - sidePadding * 2 - (colCount - 1) * colGap) / colCount;

  const rowCount = Math.ceil(items.length / colCount);
  const availableContentH = height - 36;
  const itemHeight = layoutType === 'side' && rowCount > 0
    ? Math.min(34, Math.max(26, (availableContentH - (rowCount - 1) * 5) / rowCount))
    : 32;
  const rowGap = layoutType === 'side' && rowCount > 0
    ? Math.max(3, Math.min(6, (availableContentH - rowCount * itemHeight) / Math.max(1, rowCount - 1)))
    : 5;

  items.forEach((item, idx) => {
    const col = idx % colCount;
    const row = Math.floor(idx / colCount);
    const itemX = x + sidePadding + col * (colWidth + colGap);
    const itemY = contentY + row * (itemHeight + rowGap);

    // Inner mini card for each LED screen
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(itemX, itemY, colWidth, itemHeight, 3.5, 3.5, 'FD');

    // Title: Grid Name & resolution
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(itemHeight < 30 ? 7.5 : 8);
    doc.setTextColor(15, 23, 42);

    const maxTitleChars = Math.max(8, Math.floor((colWidth - 14) / 4.5));
    const titleText = `${item.name} (${item.cols}×${item.rows})`;
    const truncatedTitle = titleText.length > maxTitleChars ? titleText.substring(0, maxTitleChars - 1) + '…' : titleText;
    doc.text(truncatedTitle, itemX + 6, itemY + (itemHeight < 30 ? 8 : 9.5));

    // Sub-lines (Data & Power)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(itemHeight < 30 ? 6.5 : 7);
    doc.setTextColor(71, 85, 105);

    let dataText = `Data: ${item.dataLinesCount}`;
    if (item.dataLinesCount > 0) dataText += ` (avg. ${item.avgDataLine} cab.)`;
    doc.text(dataText, itemX + 6, itemY + (itemHeight < 30 ? 17 : 19.5));

    let powerText = `Power: ${item.powerLinesCount}`;
    if (item.powerLinesCount > 0) powerText += ` (avg. ${item.avgPowerGroup} cab.)`;
    doc.text(powerText, itemX + 6, itemY + (itemHeight < 30 ? 25 : 28.5));
  });
}

export function parseXmlProject(xmlText: string): { outputWidth: number; outputHeight: number; grids: Record<string, GridModel> } {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Error parsing XML file');
  }

  let outputWidth = 1920;
  let outputHeight = 1080;
  const output = xmlDoc.querySelector('output');
  if (output) {
    outputWidth = parseInt(output.getAttribute('width') || '1920', 10);
    outputHeight = parseInt(output.getAttribute('height') || '1080', 10);
  }

  const gridElements = xmlDoc.querySelectorAll('grid');
  const loadedGrids: Record<string, GridModel> = {};

  gridElements.forEach((gridEl, index) => {
    const gridId = gridEl.getAttribute('id') || `LED_${index + 1}`;
    const gridName = gridEl.getAttribute('name') || `LED_${index + 1}`;
    const settings = gridEl.querySelector('settings');
    if (!settings) return;

    const cols = safeGetXmlInt(settings, 'cols', 2);
    const rows = safeGetXmlInt(settings, 'rows', 2);
    let moduleSize = (safeGetXmlText(settings, 'moduleSize', 'square') as any);
    const moduleWidth = safeGetXmlInt(settings, 'moduleWidth', 100);
    const moduleHeight = safeGetXmlInt(settings, 'moduleHeight', 100);

    if (/^\d+$/.test(moduleSize)) {
      moduleSize = 'custom';
    }

    const offsetX = Math.max(0, safeGetXmlInt(settings, 'offsetX', 0));
    const offsetY = Math.max(0, safeGetXmlInt(settings, 'offsetY', 0));
    const moduleColor = safeGetXmlText(settings, 'moduleColor', '#282828');
    const moduleLabelColor = safeGetXmlText(settings, 'moduleLabelColor', '#E6E6E6');

    let moduleLabelSizePercent = 20;
    const percentElem = settings.querySelector('moduleLabelSizePercent');
    const fontSizeElem = settings.querySelector('moduleLabelFontSize');

    if (percentElem) {
      moduleLabelSizePercent = parseInt(percentElem.textContent || '20', 10) || 20;
    } else if (fontSizeElem) {
      const oldFontSize = parseInt(fontSizeElem.textContent || '20', 10) || 20;
      const minSide = Math.min(moduleWidth, moduleHeight);
      moduleLabelSizePercent = Math.round((oldFontSize / minSide) * 100);
      moduleLabelSizePercent = Math.max(20, Math.min(40, moduleLabelSizePercent));
    }

    const dataLineFontSizePercent = safeGetXmlInt(settings, 'dataLineFontSizePercent', 35);
    const dataLineFont = safeGetXmlText(settings, 'dataLineFont', 'Merriweather, serif');
    const hatchDensity = safeGetXmlInt(settings, 'hatchDensity', 10);
    const connectionFont = safeGetXmlText(settings, 'connectionFont', 'Merriweather, serif');
    const connectionFontSize = safeGetXmlInt(settings, 'connectionFontSize', 21);
    const useDefaultNames = safeGetXmlText(settings, 'useDefaultNames', 'true') === 'true';
    const dataLineNamingMode = (safeGetXmlText(settings, 'dataLineNamingMode', '') || (useDefaultNames ? '1A-1B' : 'none')) as any;
    const dataLinePrefix = safeGetXmlText(settings, 'dataLinePrefix', '1');
    const idType = (safeGetXmlText(settings, 'idType', 'row.col') as any);
    const idFont = safeGetXmlText(settings, 'idFont', 'Arial, sans-serif');

    let visible = true;
    const visibleElem = settings.querySelector('visible');
    if (visibleElem) {
      visible = visibleElem.textContent === 'true';
    }

    let hideOverlapped = false;
    const hideOverlappedElem = settings.querySelector('hideOverlapped');
    if (hideOverlappedElem) {
      hideOverlapped = hideOverlappedElem.textContent === 'true';
    }

    const gridState: boolean[][] = [];
    gridEl.querySelectorAll('gridState > row').forEach(rowEl => {
      const rowData = (rowEl.textContent || '').split('').map(v => v === '1');
      gridState.push(rowData);
    });

    const connections: DataLineConnection[] = [];
    gridEl.querySelectorAll('dataLines > line').forEach((lineEl, lIndex) => {
      const points: Point[] = [];
      lineEl.querySelectorAll('point').forEach(pointEl => {
        points.push({
          row: parseInt(pointEl.getAttribute('row') || '0', 10),
          col: parseInt(pointEl.getAttribute('col') || '0', 10)
        });
      });

      const colorIndex = lineEl.getAttribute('colorIndex') ?
        parseInt(lineEl.getAttribute('colorIndex')!, 10) : lIndex;
      const prefix = lineEl.getAttribute('prefix') || undefined;

      connections.push({
        points,
        color: lineEl.getAttribute('color') || '#FF0000',
        colorIndex,
        name: lineEl.getAttribute('name') || '',
        endName: lineEl.getAttribute('endName') || '',
        prefix
      });
    });

    const selectedGroups: PowerGroup[] = [];
    gridEl.querySelectorAll('powerGroups > group').forEach(groupEl => {
      const modules: Point[] = [];
      groupEl.querySelectorAll('module').forEach(moduleEl => {
        modules.push({
          row: parseInt(moduleEl.getAttribute('row') || '0', 10),
          col: parseInt(moduleEl.getAttribute('col') || '0', 10)
        });
      });
      selectedGroups.push({
        index: parseInt(groupEl.getAttribute('index') || '1', 10),
        colorIndex: parseInt(groupEl.getAttribute('colorIndex') || '1', 10),
        modules
      });
    });

    const customModules: CustomModule[] = [];
    const moduleColors: Record<string, string> = {};
    gridEl.querySelectorAll('customModules > module').forEach(moduleEl => {
      const r = parseInt(moduleEl.getAttribute('row') || '0', 10);
      const c = parseInt(moduleEl.getAttribute('col') || '0', 10);
      const modColor = moduleEl.getAttribute('color') || undefined;
      const modLabelColor = moduleEl.getAttribute('labelColor') || undefined;

      if (modColor) {
        moduleColors[`${r},${c}`] = modColor;
      }

      customModules.push({
        row: r,
        col: c,
        width: parseFloat(moduleEl.getAttribute('width') || '100'),
        height: parseFloat(moduleEl.getAttribute('height') || '100'),
        anchor: (moduleEl.getAttribute('anchor') || 'top-left') as any,
        color: modColor,
        labelColor: modLabelColor
      });
    });

    gridEl.querySelectorAll('moduleColors > color').forEach(colorEl => {
      const r = colorEl.getAttribute('row');
      const c = colorEl.getAttribute('col');
      const val = colorEl.getAttribute('value');
      if (r !== null && c !== null && val) {
        moduleColors[`${r},${c}`] = val;
      }
    });

    const moduleIds: Record<string, string> = {};
    gridEl.querySelectorAll('moduleIds > id').forEach(idEl => {
      const r = idEl.getAttribute('row');
      const c = idEl.getAttribute('col');
      const val = idEl.getAttribute('value');
      if (r !== null && c !== null && val !== null) {
        moduleIds[`${r},${c}`] = val;
      }
    });

    const overlappedModules: OverlappedModule[] = [];
    gridEl.querySelectorAll('overlappedModules > module').forEach(moduleEl => {
      overlappedModules.push({
        row: parseInt(moduleEl.getAttribute('row') || '0', 10),
        col: parseInt(moduleEl.getAttribute('col') || '0', 10)
      });
    });

    const mergedSubGrids: MergedSubGrid[] = [];
    gridEl.querySelectorAll('mergedSubGrids > subGrid').forEach(subEl => {
      const subModules: Point[] = [];
      subEl.querySelectorAll('module').forEach(mEl => {
        subModules.push({
          row: parseInt(mEl.getAttribute('row') || '0', 10),
          col: parseInt(mEl.getAttribute('col') || '0', 10)
        });
      });
      mergedSubGrids.push({
        id: subEl.getAttribute('id') || 'sub',
        name: subEl.getAttribute('name') || 'Sub-Grid',
        color: subEl.getAttribute('color') || '#282828',
        labelColor: subEl.getAttribute('labelColor') || '#E6E6E6',
        idType: (subEl.getAttribute('idType') as any) || undefined,
        idFont: subEl.getAttribute('idFont') || undefined,
        moduleLabelSizePercent: subEl.getAttribute('moduleLabelSizePercent') ? parseInt(subEl.getAttribute('moduleLabelSizePercent')!, 10) : undefined,
        modules: subModules
      });
    });

    loadedGrids[gridId] = {
      name: gridName,
      cols,
      rows,
      moduleSize,
      moduleWidth,
      moduleHeight,
      offsetX,
      offsetY,
      moduleColor,
      moduleLabelColor,
      moduleLabelSizePercent,
      dataLineFontSizePercent,
      dataLineFont,
      hatchDensity,
      connectionFont,
      connectionFontSize,
      useDefaultNames,
      dataLineNamingMode,
      dataLinePrefix,
      idType,
      idFont,
      visible,
      showAllLines: false,
      showAllGroups: false,
      dataLinesPage: 0,
      powerLinesPage: 0,
      hoveredLineIndex: null,
      hoveredGroupIndex: null,
      mode: 'data-lines',
      toolAction: 'draw',
      batchSelection: {
        firstModule: null,
        isActive: false
      },
      customModules,
      mergedSubGrids: mergedSubGrids.length > 0 ? mergedSubGrids : undefined,
      moduleColors,
      moduleIds: Object.keys(moduleIds).length > 0 ? moduleIds : undefined,
      overlappedModules,
      hideOverlapped,
      showingModules: [],
      hidingModules: [],
      gridState: gridState.length > 0 ? gridState : Array(rows).fill(null).map(() => Array(cols).fill(true)),
      connections,
      selectedGroups,
      lineCounter: connections.length + 1,
      groupCounter: selectedGroups.length + 1,
      removedIndices: [],
      removedGroupIndices: [],
      currentConnection: [],
      currentColor: null,
      currentColorIndex: null,
      selectedModules: [],
      visibilityStart: null,
      blinkInterval: null,
      rectFirstCorner: null,
      powerFirstCorner: null
    };
  });

  return { outputWidth, outputHeight, grids: loadedGrids };
}
