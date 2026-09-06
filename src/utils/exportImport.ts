import { GridModel, Point, DataLineConnection, PowerGroup, CustomModule, OverlappedModule, MergedSubGrid, CanvasBackgroundStyle } from '../types';
import { GROUP_COLORS, APP_VERSION, MAIN_COLORS } from '../constants';
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
    xml.push(`        <dataLineNamingMode>${grid.dataLineNamingMode || (grid.useDefaultNames ? '1.1-1.9' : 'none')}</dataLineNamingMode>`);
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
      const exportColor = (conn.color && conn.color !== '#000000')
        ? conn.color
        : MAIN_COLORS[colorIndex % MAIN_COLORS.length];
      xml.push(`        <line index="${index}" colorIndex="${colorIndex}" color="${exportColor}" name="${escapeXml(conn.name || '')}" endName="${escapeXml(conn.endName || '')}"${prefixAttr}>`);
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

export interface CanvasBackgroundExportOptions {
  canvasBackground?: CanvasBackgroundStyle;
  backgroundColor?: string;
  gridCellSize?: number;
  dotsSpacing?: number;
  patternBrightness?: number;
}

export function getPatternColors(brightnessPercent: number = 29): { bgColor: string; fgColor: string; fgAlpha: number } {
  // brightnessPercent: 0 (pure black #000000) to 100 (pure white #FFFFFF)
  // Default 29 corresponds to ~#4A4A4A (74/255)
  const clamped = Math.max(0, Math.min(100, brightnessPercent));
  const channel = Math.round((clamped / 100) * 255);
  const hex = channel.toString(16).padStart(2, '0');
  const bgColor = `#${hex}${hex}${hex}`;

  // If background is dark (luminance < 128 / 50%), foreground elements should be bright/white
  // If background is light (luminance >= 128 / 50%), foreground elements should be dark/black
  if (channel < 128) {
    // Dark bg -> white lines/dots with contrast
    const contrastRatio = 1 - (channel / 255);
    const alpha = 0.15 + contrastRatio * 0.25; // 0.15 to 0.40
    return { bgColor, fgColor: '255, 255, 255', fgAlpha: Number(alpha.toFixed(2)) };
  } else {
    // Light bg -> black lines/dots with contrast
    const contrastRatio = (channel / 255);
    const alpha = 0.15 + contrastRatio * 0.25; // 0.15 to 0.40
    return { bgColor, fgColor: '0, 0, 0', fgAlpha: Number(alpha.toFixed(2)) };
  }
}

export function generateSVGString(
  grids: Record<string, GridModel>,
  outputWidth: number,
  outputHeight: number,
  altLineStyle = true,
  includeCanvasBorder = true,
  bgOptions?: CanvasBackgroundExportOptions
): string {
  const svg: string[] = [];
  svg.push('<?xml version="1.0" encoding="UTF-8"?>');
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}">`);
  svg.push('  <title>LedFlow Export</title>');
  svg.push(`  <desc>Created with LedFlow v${APP_VERSION}</desc>`);

  const bgStyle = bgOptions?.canvasBackground || 'transparent';
  const solidBg = bgOptions?.backgroundColor || '#151518';
  const gridCellSize = Math.max(5, Math.min(200, bgOptions?.gridCellSize || 25));
  const dotsSpacing = Math.max(5, Math.min(200, bgOptions?.dotsSpacing || 25));
  const patternBrightness = bgOptions?.patternBrightness ?? 29;
  const patternColors = getPatternColors(patternBrightness);

  // Render SVG Canvas Background Layer
  if (bgStyle === 'solid') {
    svg.push(`  <!-- Solid Background -->`);
    svg.push(`  <rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="${solidBg}"/>`);
  } else if (bgStyle === 'grid') {
    svg.push(`  <!-- Grid Background (${patternColors.bgColor} with ${gridCellSize}px cells) -->`);
    svg.push(`  <defs>`);
    svg.push(`    <pattern id="svg-bg-grid-pattern" width="${gridCellSize}" height="${gridCellSize}" patternUnits="userSpaceOnUse">`);
    svg.push(`      <path d="M ${gridCellSize} 0 L 0 0 0 ${gridCellSize}" fill="none" stroke="rgba(${patternColors.fgColor}, ${patternColors.fgAlpha})" stroke-width="1"/>`);
    svg.push(`    </pattern>`);
    svg.push(`  </defs>`);
    svg.push(`  <rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="${patternColors.bgColor}"/>`);
    svg.push(`  <rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="url(#svg-bg-grid-pattern)"/>`);
  } else if (bgStyle === 'dots') {
    svg.push(`  <!-- Dots Background (${patternColors.bgColor} with ${dotsSpacing}px spacing) -->`);
    const dotR = Math.max(1, Math.min(3, dotsSpacing * 0.05));
    svg.push(`  <defs>`);
    svg.push(`    <pattern id="svg-bg-dots-pattern" width="${dotsSpacing}" height="${dotsSpacing}" patternUnits="userSpaceOnUse">`);
    svg.push(`      <circle cx="${dotsSpacing / 2}" cy="${dotsSpacing / 2}" r="${dotR}" fill="rgba(${patternColors.fgColor}, ${patternColors.fgAlpha * 1.4})"/>`);
    svg.push(`    </pattern>`);
    svg.push(`  </defs>`);
    svg.push(`  <rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="${patternColors.bgColor}"/>`);
    svg.push(`  <rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="url(#svg-bg-dots-pattern)"/>`);
  }

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
            const hatchColor = (conn.color && conn.color !== '#000000')
              ? conn.color
              : MAIN_COLORS[lineIndex % MAIN_COLORS.length];

            conn.points.forEach(point => {
              if (!grid.gridState[point.row] || !grid.gridState[point.row][point.col]) return;
              const geom = getModuleGeometry(grid, point.row, point.col);
              const patternId = `hatch-${gridId}-${index}-${point.row}-${point.col}`;

              patterns.push(`        <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${step}" height="${step}">`);
              if (isForwardSlash) {
                patterns.push(`          <line x1="0" y1="0" x2="${step}" y2="${step}" stroke="${hatchColor}" stroke-width="2" opacity="0.5"/>`);
              } else {
                patterns.push(`          <line x1="0" y1="${step}" x2="${step}" y2="0" stroke="${hatchColor}" stroke-width="2" opacity="0.5"/>`);
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

          const lineColor = '#000000';

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

          if (visiblePoints.length === 1) {
            if (conn.name || conn.endName) {
              const first = visiblePoints[0];
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
              if (labelText) {
                svg.push(`      <text x="${labelX}" y="${labelY}" dy="0.35em" font-family="${grid.dataLineFont}" font-size="${dataLineFontSize}" font-weight="bold" fill="#000000" text-anchor="middle">${escapeXml(labelText)}</text>`);
              }
            }
          } else if (visiblePoints.length >= 2) {
            const first = visiblePoints[0];
            const second = visiblePoints[1];
            const last = visiblePoints[visiblePoints.length - 1];
            const secondLast = visiblePoints[visiblePoints.length - 2];

            if (conn.name) {
              const geom = getModuleGeometry(grid, first.row, first.col);
              const minSide = Math.min(geom.width, geom.height);
              const dataLineFontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));

              let labelX = geom.centerX;
              let labelY = geom.centerY;

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

              svg.push(`      <text x="${labelX}" y="${labelY}" dy="0.35em" font-family="${grid.dataLineFont}" font-size="${dataLineFontSize}" font-weight="bold" fill="#000000" text-anchor="middle">${escapeXml(conn.name)}</text>`);
            }

            if (conn.endName) {
              const geom = getModuleGeometry(grid, last.row, last.col);
              const minSide = Math.min(geom.width, geom.height);
              const dataLineFontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));

              let labelX = geom.centerX;
              let labelY = geom.centerY;

              if (secondLast.col > last.col || secondLast.row < last.row) {
                labelX = geom.x + geom.width / 4;
                labelY = geom.y + 3 * geom.height / 4;
              } else if (secondLast.col < last.col || secondLast.row > last.row) {
                labelX = geom.x + 3 * geom.width / 4;
                labelY = geom.y + geom.height / 4;
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
  altLineStyle = true,
  bgOptions?: CanvasBackgroundExportOptions
): void {
  const svgContent = generateSVGString(grids, outputWidth, outputHeight, altLineStyle, true, bgOptions);
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ledflow_export.svg';
  link.click();
  URL.revokeObjectURL(url);
}

export interface PdfExportOptions {
  includeSummary?: boolean;
  includeCanvasBorder?: boolean;
  altLineStyle?: boolean;
  canvasBackground?: CanvasBackgroundStyle;
  backgroundColor?: string;
  gridCellSize?: number;
  dotsSpacing?: number;
  patternBrightness?: number;
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
  const includeCanvasBorder = options.includeCanvasBorder ?? false;
  const includeSummary = options.includeSummary ?? true;

  const svgContent = generateSVGString(grids, outputWidth, outputHeight, altLineStyle, includeCanvasBorder, {
    canvasBackground: options.canvasBackground,
    backgroundColor: options.backgroundColor,
    gridCellSize: options.gridCellSize,
    dotsSpacing: options.dotsSpacing,
    patternBrightness: options.patternBrightness
  });
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = svgDoc.documentElement as unknown as SVGElement;

  const { jsPDF } = await import('jspdf');
  const { svg2pdf } = await import('svg2pdf.js');

  // Prepare detailed technical specification items for engineering summary schedule
  let gridEntries = Object.entries(grids).filter(([_, g]) => g.visible !== false);
  if (gridEntries.length === 0) {
    gridEntries = Object.entries(grids);
  }
  const totalGridsCount = gridEntries.length;

  const summaryItems = gridEntries.map(([_, grid], index) => {
    const dataLinesCount = grid.connections.length;
    const powerLinesCount = grid.selectedGroups.length;

    let totalDataLineCabinets = 0;
    const connectedDataPoints = new Set<string>();
    grid.connections.forEach((conn) => {
      conn.points.forEach((point) => {
        if (grid.gridState[point.row] && grid.gridState[point.row][point.col]) {
          totalDataLineCabinets++;
          connectedDataPoints.add(`${point.row},${point.col}`);
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

    let activeCabinets = 0;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.gridState[r] && grid.gridState[r][c]) {
          activeCabinets++;
        }
      }
    }

    const totalCabinets = grid.cols * grid.rows;
    const modW = grid.moduleWidth || 100;
    const modH = grid.moduleHeight || 100;
    const dimW = grid.cols * modW;
    const dimH = grid.rows * modH;

    const unroutedCount = Math.max(0, activeCabinets - connectedDataPoints.size);
    const avgDataLine = dataLinesCount > 0 ? (totalDataLineCabinets / dataLinesCount).toFixed(1) : '0';
    const avgPowerGroup = powerLinesCount > 0 ? (totalPowerGroupCabinets / powerLinesCount).toFixed(1) : '0';

    return {
      id: String(index + 1).padStart(2, '0'),
      name: grid.name,
      cols: grid.cols,
      rows: grid.rows,
      activeCabinets,
      totalCabinets,
      modW,
      modH,
      dimW,
      dimH,
      dataLinesCount,
      totalDataLineCabinets,
      avgDataLine,
      powerLinesCount,
      totalPowerGroupCabinets,
      avgPowerGroup,
      unroutedCount
    };
  });

  const totalActiveCabinets = summaryItems.reduce((acc, it) => acc + it.activeCabinets, 0);
  const totalAllCabinets = summaryItems.reduce((acc, it) => acc + it.totalCabinets, 0);
  const totalDataLines = summaryItems.reduce((acc, it) => acc + it.dataLinesCount, 0);
  const totalDataCabinets = summaryItems.reduce((acc, it) => acc + it.totalDataLineCabinets, 0);
  const totalPowerGroups = summaryItems.reduce((acc, it) => acc + it.powerLinesCount, 0);
  const totalPowerCabinets = summaryItems.reduce((acc, it) => acc + it.totalPowerGroupCabinets, 0);
  const totalUnrouted = summaryItems.reduce((acc, it) => acc + it.unroutedCount, 0);
  const globalAvgData = totalDataLines > 0 ? (totalDataCabinets / totalDataLines).toFixed(1) : '0';
  const globalAvgPower = totalPowerGroups > 0 ? (totalPowerCabinets / totalPowerGroups).toFixed(1) : '0';

  const globalStats = {
    totalScreens: totalGridsCount,
    totalActiveCabinets,
    totalAllCabinets,
    totalDataLines,
    totalDataCabinets,
    totalPowerGroups,
    totalPowerCabinets,
    totalUnrouted,
    globalAvgData,
    globalAvgPower
  };

  const N = summaryItems.length;
  const hasSummary = includeSummary && N > 0;

  // Scale typography and table dimensions proportionally with canvas resolution
  const scaleFactor = Math.max(0.85, Math.min(2.5, outputWidth / 1200));

  const colHeaderH = Math.round(28 * scaleFactor);
  const rowH = Math.round(26 * scaleFactor);
  const totalsH = Math.round(28 * scaleFactor);
  const tableH = colHeaderH + N * rowH + totalsH;

  const margin = hasSummary ? Math.round(Math.max(16, Math.min(48, outputWidth * 0.02))) : 0;
  const gap = hasSummary ? Math.round(Math.max(16, Math.min(36, outputWidth * 0.015))) : 0;

  const pageWidth = hasSummary ? outputWidth + margin * 2 : outputWidth;
  const pageHeight = hasSummary ? outputHeight + margin * 2 + gap + tableH : outputHeight;

  const doc = new jsPDF({
    orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pageWidth, pageHeight]
  });

  // Clean white canvas background for PDF
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  const diagX = hasSummary ? margin : 0;
  const diagY = hasSummary ? margin : 0;

  await svg2pdf(svgElement, doc, {
    x: diagX,
    y: diagY,
    width: outputWidth,
    height: outputHeight
  });

  if (hasSummary) {
    const sumX = margin;
    const sumY = margin + outputHeight + gap;
    const sumW = outputWidth;
    const sumH = tableH;

    drawPdfSummary(doc, sumX, sumY, sumW, sumH, outputWidth, outputHeight, summaryItems, globalStats, scaleFactor);
  }

  doc.save(`ledflow_export_${outputWidth}x${outputHeight}.pdf`);
}

interface SummaryItem {
  id: string;
  name: string;
  cols: number;
  rows: number;
  activeCabinets: number;
  totalCabinets: number;
  modW: number;
  modH: number;
  dimW: number;
  dimH: number;
  dataLinesCount: number;
  totalDataLineCabinets: number;
  avgDataLine: string;
  powerLinesCount: number;
  totalPowerGroupCabinets: number;
  avgPowerGroup: string;
  unroutedCount: number;
}

interface GlobalStats {
  totalScreens: number;
  totalActiveCabinets: number;
  totalAllCabinets: number;
  totalDataLines: number;
  totalDataCabinets: number;
  totalPowerGroups: number;
  totalPowerCabinets: number;
  totalUnrouted: number;
  globalAvgData: string;
  globalAvgPower: string;
}

function drawPdfSummary(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  outputWidth: number,
  outputHeight: number,
  items: SummaryItem[],
  stats: GlobalStats,
  scaleFactor: number
) {
  // ==========================================
  // FORMAL TECHNICAL SPECIFICATION SCHEDULE TABLE
  // ==========================================
  const colHeaderH = Math.round(28 * scaleFactor);
  const rowH = Math.round(26 * scaleFactor);
  const totalsH = Math.round(28 * scaleFactor);
  const actualTableH = colHeaderH + items.length * rowH + totalsH;

  const headerFontSize = Math.round(10 * scaleFactor);
  const rowFontSize = Math.round(9.5 * scaleFactor);
  const totalsFontSize = Math.round(10 * scaleFactor);
  const padX = Math.round(8 * scaleFactor);

  // Outer table container
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(Math.max(0.75, 1 * scaleFactor));
  doc.rect(x, y, width, actualTableH, 'FD');

  // Table Column Dimensions (Index column + 6 data columns)
  const posW = Math.round(Math.max(34 * scaleFactor, width * 0.045));
  const matrixW = Math.round(Math.max(70 * scaleFactor, width * 0.11));
  const cabW = Math.round(Math.max(75 * scaleFactor, width * 0.12));
  const sizeW = Math.round(Math.max(90 * scaleFactor, width * 0.14));
  const remainingW = width - (posW + matrixW + cabW + sizeW);

  const nameW = Math.round(Math.max(140 * scaleFactor, remainingW * 0.42));
  const cablingW = remainingW - nameW;
  const dataW = Math.round(cablingW * 0.5);
  const powerW = cablingW - dataW;

  const colX = [
    x,
    x + posW,
    x + posW + nameW,
    x + posW + nameW + matrixW,
    x + posW + nameW + matrixW + cabW,
    x + posW + nameW + matrixW + cabW + sizeW,
    x + posW + nameW + matrixW + cabW + sizeW + dataW
  ];

  // Table Column Headers Row
  const colHeaderY = y;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(x, colHeaderY, width, colHeaderH, 'F');

  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(Math.max(0.5, 0.75 * scaleFactor));
  doc.line(x, colHeaderY + colHeaderH, x + width, colHeaderY + colHeaderH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(headerFontSize);
  doc.setTextColor(30, 41, 59); // slate-800

  const headerTextY = colHeaderY + colHeaderH / 2 + (headerFontSize * 0.35);

  // Note: First column header is intentionally left blank (no "POS" text)
  doc.text('SCREEN ID', colX[1] + padX, headerTextY);
  doc.text('COLS × ROWS', colX[2] + matrixW / 2, headerTextY, { align: 'center' });
  doc.text('CABINETS', colX[3] + cabW / 2, headerTextY, { align: 'center' });
  doc.text('SIZE (W×H)', colX[4] + sizeW / 2, headerTextY, { align: 'center' });
  doc.text('DATA CABLING', colX[5] + padX, headerTextY);
  doc.text('POWER GROUPS', colX[6] + padX, headerTextY);

  // Vertical dividers in column headers
  for (let c = 1; c < colX.length; c++) {
    doc.setDrawColor(203, 213, 225);
    doc.line(colX[c], colHeaderY, colX[c], colHeaderY + colHeaderH);
  }

  // Table Data Rows
  items.forEach((item, idx) => {
    const rowY = colHeaderY + colHeaderH + idx * rowH;

    // Row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(x, rowY, width, rowH, 'F');
    }

    // Row bottom divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(Math.max(0.5, 0.75 * scaleFactor));
    doc.line(x, rowY + rowH, x + width, rowY + rowH);

    // Vertical column dividers
    for (let c = 1; c < colX.length; c++) {
      doc.line(colX[c], rowY, colX[c], rowY + rowH);
    }

    const textY = rowY + rowH / 2 + (rowFontSize * 0.35);

    // Row Position / Number (e.g., 01, 02...)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(rowFontSize);
    doc.setTextColor(100, 116, 139);
    doc.text(item.id, colX[0] + posW / 2, textY, { align: 'center' });

    // Screen ID / Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(rowFontSize);
    doc.setTextColor(15, 23, 42);
    const maxNameChars = Math.max(14, Math.floor((nameW - padX * 2) / (rowFontSize * 0.58)));
    const truncatedName = item.name.length > maxNameChars ? item.name.substring(0, maxNameChars - 1) + '…' : item.name;
    doc.text(truncatedName, colX[1] + padX, textY);

    // Matrix
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${item.cols} × ${item.rows}`, colX[2] + matrixW / 2, textY, { align: 'center' });

    // Cabinets
    const cabText = item.activeCabinets === item.totalCabinets
      ? `${item.activeCabinets} cab.`
      : `${item.activeCabinets} / ${item.totalCabinets}`;
    doc.text(cabText, colX[3] + cabW / 2, textY, { align: 'center' });

    // Size
    doc.text(`${item.dimW}×${item.dimH} px`, colX[4] + sizeW / 2, textY, { align: 'center' });

    // Data Lines
    const dataStr = item.dataLinesCount > 0
      ? `${item.dataLinesCount} line${item.dataLinesCount === 1 ? '' : 's'} (avg ${item.avgDataLine})`
      : '-';
    doc.text(dataStr, colX[5] + padX, textY);

    // Power Groups
    const powerStr = item.powerLinesCount > 0
      ? `${item.powerLinesCount} group${item.powerLinesCount === 1 ? '' : 's'} (avg ${item.avgPowerGroup})`
      : '-';
    doc.text(powerStr, colX[6] + padX, textY);
  });

  // Table Totals / Summary Footer Row
  const totalsY = colHeaderY + colHeaderH + items.length * rowH;
  doc.setFillColor(226, 232, 240); // slate-200
  doc.rect(x, totalsY, width, totalsH, 'F');

  doc.setDrawColor(100, 116, 139); // slate-500
  doc.setLineWidth(Math.max(0.75, 1 * scaleFactor));
  doc.line(x, totalsY, x + width, totalsY);

  for (let c = 1; c < colX.length; c++) {
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(Math.max(0.5, 0.75 * scaleFactor));
    doc.line(colX[c], totalsY, colX[c], totalsY + totalsH);
  }

  const totalsTextY = totalsY + totalsH / 2 + (totalsFontSize * 0.35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(totalsFontSize);
  doc.setTextColor(15, 23, 42);

  doc.text('-', colX[0] + posW / 2, totalsTextY, { align: 'center' });
  doc.text(`TOTALS (${stats.totalScreens} SCREEN${stats.totalScreens === 1 ? '' : 'S'})`, colX[1] + padX, totalsTextY);
  doc.text('-', colX[2] + matrixW / 2, totalsTextY, { align: 'center' });
  doc.text(`${stats.totalActiveCabinets} cab.`, colX[3] + cabW / 2, totalsTextY, { align: 'center' });
  doc.text(`CANVAS ${outputWidth}×${outputHeight}`, colX[4] + sizeW / 2, totalsTextY, { align: 'center' });

  const totalDataStr = stats.totalDataLines > 0
    ? `${stats.totalDataLines} lines (avg ${stats.globalAvgData})`
    : '-';
  doc.text(totalDataStr, colX[5] + padX, totalsTextY);

  const totalPowerStr = stats.totalPowerGroups > 0
    ? `${stats.totalPowerGroups} group${stats.totalPowerGroups === 1 ? '' : 's'} (avg ${stats.globalAvgPower})`
    : '-';
  doc.text(totalPowerStr, colX[6] + padX, totalsTextY);
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
    const parsedNamingMode = safeGetXmlText(settings, 'dataLineNamingMode', '');
    const dataLineNamingMode = (parsedNamingMode === 'p.1-p.9' ? '1.1-1.9' : (parsedNamingMode || (useDefaultNames ? '1.1-1.9' : 'none'))) as any;
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
