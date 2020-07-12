/// <reference path="../Data/Block.js" />

class SSD {
    // 硬盘可用内区块，暂且优先使用顶层
    freeBlocks;

    //已使用区块
    usedBlocks;

    constructor(count) {
        this.freeBlocks = new Array(count);
        this.usedBlocks = [];
        let pgIndex = 0;
        for (let i = 0; i < this.freeBlocks.length; i++) {
            this.freeBlocks[i] = new Block("");
            this.freeBlocks[i].pages.forEach(element => {
                element.num = 'S' + pgIndex++;
            });
        }
        this.datum = [];
    }

    //向SSD中的空闲区块写入数据
    WriteBlock(block) {
        if (this.freeBlocks.length > 0) {
            Block.Clone(block, this.freeBlocks[0]);
            let blk = this.freeBlocks.shift();
            this.usedBlocks.push(blk);
            return blk;
        } else {
            throw new Error("没有可用区块！");
        }
    }

    // 释放区块
    Free(block) {
        let target = jQuery.inArray(block, this.usedBlocks);
        if (target != -1) {
            this.usedBlocks[target].Clean();
            this.freeBlocks.push(this.usedBlocks[target]);
            this.usedBlocks.splice(target, 1);
        } else {
            throw new Error("找不到此Block！");
        }
    }
}