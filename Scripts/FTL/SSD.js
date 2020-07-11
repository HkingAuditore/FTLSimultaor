/// <reference path="../Data/Block.js" />

class SSD {
    // 硬盘可用内区块，暂且优先使用顶层
    freeBlocks;

    //已使用区块
    usedBlocks;

    constructor(count) {
        this.freeBlocks = new Array(count);
        this.usedBlocks = [];
        for (let i = 0; i < this.freeBlocks.length; i++) {
            this.freeBlocks[i] = new Block("");
        }
        this.datum = [];
    }

    WriteData(block) {
        if (this.freeBlocks.length > 0) {
            Block.Clone(block, this.freeBlocks[0]);
            let blk = this.freeBlocks.shift();
            this.usedBlocks.push(blk);
            return blk;
        } else {
            throw new Error("没有可用区块！");
        }
    }
}