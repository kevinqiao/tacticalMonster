
export const getDualBounds = (width: number, height: number, column: number, row: number): { name: string; top: number; left: number; width: number; height: number; radius?: number }[] => {
    const bounds: { name: string; top: number; left: number; width: number; height: number; radius?: number }[] = [];

    const direction = width > height ? 1 : 0;
    if (direction > 0) {
        bounds.push({ name: "console", top: 60, left: width * 0.25, width: width * 0.5, height: height * 0.4 - 10 });

        const ow = Math.floor((0.7 * 0.4 * width) / column);
        const oh = Math.floor((0.7 * 0.6 * height) / row);
        const oradius = Math.min(ow, oh);
        const owidth = oradius * column;
        const oheight = oradius * row;
        const otop = (height - oheight) / 2;
        const oleft = (0.4 * width - owidth) / 2;
        bounds.push({ name: "opponent", top: otop, left: oleft, width: owidth, height: oheight, radius: oradius });

        const pw = Math.floor((0.7 * 0.6 * width) / column);
        const ph = Math.floor((0.7 * (height - 10)) / row);
        const pradius = Math.min(Math.min(pw, ph), 70);
        const pwidth = pradius * column;
        const pheight = pradius * row;
        const ptop = 60 + (height - pheight) / 2;
        const pleft = 0.4 * width + (0.6 * width - pwidth) / 2;
        bounds.push({
            name: "player",
            top: ptop,
            left: pleft,
            width: pwidth,
            height: pheight,
            radius: pradius,
        });

    } else {
        //console: 0.4x0.35   opponent:0.6x0.35 player:1x0.65
        bounds.push({ name: "console", top: 30, left: width * 0.04, width: width * 0.5, height: height * 0.35 - 10 });

        const ow = Math.floor((0.75 * 0.5 * width) / column);
        const oh = Math.floor((0.75 * 0.35 * height) / row);
        const oradius = Math.min(ow, oh);
        const owidth = oradius * column;
        const oheight = oradius * row;
        const otop = (0.35 * height - oheight) / 2;
        const oleft = 0.5 * width + (0.5 * width - owidth) / 2;
        bounds.push({ name: "opponent", top: otop, left: oleft, width: owidth, height: oheight, radius: oradius });

        const pw = Math.floor((0.8 * width) / column);
        const ph = Math.floor((0.9 * 0.65 * height) / row);
        const pradius = Math.min(60, Math.min(pw, ph));
        const pwidth = pradius * column;
        const pheight = pradius * row;
        const ptop = 0.35 * height - 20 + (0.65 * height - pheight) / 2;
        const pleft = (width - pwidth) / 2;
        bounds.push({
            name: "player",
            top: ptop,
            left: pleft,
            width: pwidth,
            height: pheight,
            radius: pradius,
        });

    }
    return bounds;
}

export const getMonoBounds = (width: number, height: number, column: number, row: number): { name: string; top: number; left: number; width: number; height: number; radius?: number }[] => {
    const bounds: { name: string; top: number; left: number; width: number; height: number; radius?: number; mono?: number }[] = [];

    bounds.push({ name: "console", top: 30, left: width * 0.2, width: width * 0.6, height: height * 0.3 - 10, mono: 1 });

    const pw = Math.floor((0.8 * width) / column);
    const ph = Math.floor(0.63 * height / row);
    const pradius = Math.min(pw, ph);
    const pwidth = pradius * column;
    const pheight = pradius * row;
    const ptop = 0.3 * height + (0.7 * height - pheight) / 2;
    const pleft = (width - pwidth) / 2;
    bounds.push({
        name: "player",
        top: ptop,
        left: pleft,
        width: pwidth,
        height: pheight,
        radius: pradius,
    });
    return bounds;
}

export const getGameBound = (width: number, height: number, column: number, row: number, mode: number,): { top: number; left: number; width: number; height: number; radius: number } | null => {
    //mode:0-single game 1-primary in dual 2-second in dual 
    const direction = width > height ? 1 : 0;
    let bound: { top: number; left: number; width: number; height: number; radius: number } | null = null;
    switch (mode) {
        case 0:
            {
                const pw = Math.floor((0.8 * width) / column);
                const ph = Math.floor(0.6 * height / row);
                const pradius = Math.min(60, Math.min(pw, ph));
                const pwidth = pradius * column;
                const pheight = pradius * row;
                const ptop = 0.3 * height + (0.6 * height - pheight) / 2;
                const pleft = (width - pwidth) / 2;
                bound = {
                    top: ptop,
                    left: pleft,
                    width: pwidth,
                    height: pheight,
                    radius: pradius,
                }
            }
            break;
        case 1:
            {
                const pw = Math.floor(((direction > 0 ? 0.7 * 0.6 : 0.8) * width) / column);
                const ph = Math.floor(((direction > 0 ? 0.7 * (height - 10) : (0.9 * 0.65 * height)) / row));
                const pradius = Math.min(Math.min(pw, ph), (direction > 0 ? 70 : 60));
                const pwidth = pradius * column;
                const pheight = pradius * row;
                const ptop = direction > 0 ? 60 + (height - pheight) / 2 : 0.35 * height - 20 + (0.65 * height - pheight) / 2;
                const pleft = direction > 0 ? 0.4 * width + (0.6 * width - pwidth) / 2 : (width - pwidth) / 2;
                bound = {
                    top: ptop,
                    left: pleft,
                    width: pwidth,
                    height: pheight,
                    radius: pradius,
                }
            }
            break;
        case 2:
            {
                const ow = Math.floor(((direction > 0 ? 0.7 * 0.4 : 0.75 * 0.5) * width) / column);
                const oh = Math.floor(((direction > 0 ? 0.7 * 0.6 : 0.75 * 0.35) * height) / row);
                const oradius = Math.min(ow, oh);
                const owidth = oradius * column;
                const oheight = oradius * row;
                const otop = direction > 0 ? (height - oheight) / 2 : (0.35 * height - oheight) / 2;
                const oleft = direction > 0 ? (0.4 * width - owidth) / 2 : 0.5 * width + (0.5 * width - owidth) / 2;
                bound = {
                    top: otop,
                    left: oleft,
                    width: owidth,
                    height: oheight,
                    radius: oradius,
                }

            }

            break;

        default:
            break;
    }

    return bound;
}

export const getGameConsoleBound = (width: number, height: number, mode: number,): { top: number; left: number; width: number; height: number; } | null => {
    //mode:0-single game 1-primary in dual 2-second in dual 
    const direction = width > height ? 1 : 0;
    const w = Math.floor((direction > 0 ? 0.7 * 0.4 : 0.75 * 0.5) * width);
    let bound: { top: number; left: number; width: number; height: number; radius?: number; mono?: number } | null = null;
    switch (mode) {
        case 0:
            {
                const ctop = 60;
                const cleft = width * 0.25;
                const cwidth = width * 0.5;
                const cheight = height * 0.4 - 10;
                bound = {
                    top: ctop,
                    left: cleft,
                    width: cwidth,
                    height: cheight,
                }
            }
            break;
        case 1:
            {

                const ptop = 60;
                const pleft = Math.floor(direction > 0 ? (0.4 * width - w) / 2 : (0.5 * width - w) / 2);
                const pwidth = Math.floor(w / 2);
                const pheight = Math.min(height * 0.3, 250);
                bound = {
                    top: ptop,
                    left: pleft,
                    width: pwidth,
                    height: pheight,
                }
            }
            break;
        case 2:
            {
                const otop = 60;
                const oleft = Math.floor(direction > 0 ? width * 0.4 / 2 : width * 0.5 / 2);
                const owidth = Math.floor(w / 2);
                const oheight = Math.min(height * 0.3, 250);
                bound = {
                    top: otop,
                    left: oleft,
                    width: owidth,
                    height: oheight,
                }

            }

            break;

        default:
            break;
    }

    return bound;
}
