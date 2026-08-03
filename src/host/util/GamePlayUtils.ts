const clusters = [];

type Tile = {
    type: number;
    shift: number;
}
type Level = {
    x: number;
    y: number;
    columns: number;
    rows: number;
    tilewidth: number;
    tileheight: number;
    tiles: Tile[][];
    selectedtile: { selected: boolean; column: number; row: number }
}
const level: Level = {
    x: 250,         // X position
    y: 113,         // Y position
    columns: 8,     // Number of tile columns
    rows: 8,        // Number of tile rows
    tilewidth: 40,  // Visual width of a tile
    tileheight: 40, // Visual height of a tile
    tiles: [],      // The two-dimensional tile array
    selectedtile: { selected: false, column: 0, row: 0 }
};
export const resolveClusters = () => {
    findClusters();

    // While there are clusters left
    while (clusters.length > 0) {

        // Remove clusters
        removeClusters();

        // Shift tiles
        shiftTiles();

        // Check if there are clusters left
        findClusters();
    }
}
const findClusters = () => {
    const clusters = []

    // Find horizontal clusters
    for (let j = 0; j < level.rows; j++) {
        // Start with a single tile, cluster of 1
        let matchlength = 1;
        for (let i = 0; i < level.columns; i++) {
            let checkcluster = false;

            if (i == level.columns - 1) {
                // Last tile
                checkcluster = true;
            } else {
                // Check the type of the next tile
                if (level.tiles[i][j].type == level.tiles[i + 1][j].type &&
                    level.tiles[i][j].type != -1) {
                    // Same type as the previous tile, increase matchlength
                    matchlength += 1;
                } else {
                    // Different type
                    checkcluster = true;
                }
            }

            // Check if there was a cluster
            if (checkcluster) {
                if (matchlength >= 3) {
                    // Found a horizontal cluster
                    clusters.push({
                        column: i + 1 - matchlength, row: j,
                        length: matchlength, horizontal: true
                    });
                }

                matchlength = 1;
            }
        }
    }

    // Find vertical clusters
    for (let i = 0; i < level.columns; i++) {
        // Start with a single tile, cluster of 1
        let matchlength = 1;
        for (let j = 0; j < level.rows; j++) {
            let checkcluster = false;

            if (j == level.rows - 1) {
                // Last tile
                checkcluster = true;
            } else {
                // Check the type of the next tile
                if (level.tiles[i][j].type == level.tiles[i][j + 1].type &&
                    level.tiles[i][j].type != -1) {
                    // Same type as the previous tile, increase matchlength
                    matchlength += 1;
                } else {
                    // Different type
                    checkcluster = true;
                }
            }

            // Check if there was a cluster
            if (checkcluster) {
                if (matchlength >= 3) {
                    // Found a vertical cluster
                    clusters.push({
                        column: i, row: j + 1 - matchlength,
                        length: matchlength, horizontal: false
                    });
                }

                matchlength = 1;
            }
        }
    }
    return;
}
const removeClusters = () => {
    return;
}
const shiftTiles = () => {
    return;
}
