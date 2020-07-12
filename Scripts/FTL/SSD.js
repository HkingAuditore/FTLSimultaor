/// <reference path="../Data/Block.js" />

/* #region  自动生成盘符 */
//盘符生成器
function* SsdNameGenerator() {
    let index = 0;
    while (true) yield String.fromCharCode("A".charCodeAt() + index++);
}
var ssdNameGenerator = SsdNameGenerator();

function DefaultSSDName() {
    return ssdNameGenerator.next().value;
}

/* #endregion */


class SSD {
    // 硬盘可用内区块，暂且优先使用顶层
    freeBlocks;

    //已使用区块
    usedBlocks;

    // SSD名称
    name;

    static NUM_SIZE = 5;

    constructor(count, name = DefaultSSDName()) {
        this.freeBlocks = new Array(count);
        this.usedBlocks = [];
        let pgIndex = 0;
        let blIndex = 0;
        for (let i = 0; i < this.freeBlocks.length; i++) {
            this.freeBlocks[i] = new Block(
                "",
                String(blIndex++).padStart(SSD.NUM_SIZE, "0")
            );
            this.freeBlocks[i].pages.forEach((element) => {
                element.num = String(pgIndex++).padStart(SSD.NUM_SIZE, "0");
            });
        }
        this.datum = [];
        this.name = name;
    }

    /* #region  数据读写 */
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

    WriteData(data) {
        // 向SSD中的块写入数据
        let savedBls = [];
        this.datum.push(data);
        for (let i = 0; i < data.blocks.length; i++) {
            try {
                savedBls.push(this.WriteBlock(data.blocks[i]));
            } catch (e) {
                console.log(e.message);
                break;
            }
        }
        data.ssd = this;
        origin = data.blocks;
        data.blocks = savedBls;
        return origin;
    }

    DeleteData(data) {
        if (data.ssd != this)
            throw new Error("这个Data不在此SSD！")
        for (let block of data.blocks) {
            this.Free(block);
        }
        this.datum.splice(this.datum.indexOf(data), 1);
        data.ssd = undefined;
        data.blocks = null;
        data = null;
    }

    /* #endregion */

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

    /* #region   地址映射*/
    // 根据data名称查找data
    FindData(name) {
        return this.datum.find((d) => d.name == name);
    }

    // 根据page编号查找page
    FindPage(num) {
        let targetNum = String(num).padStart(SSD.NUM_SIZE, "0");
        let blocks = this.usedBlocks.concat(this.freeBlocks);
        for (let bl of blocks) {
            let tmp = bl.pages.find((p) => p.num == targetNum);
            if (tmp !== undefined) return tmp;
        }
        return null;
    }

    // 根据block编号查找block
    FindBlock(num) {
        let blocks = this.freeBlocks.concat(this.usedBlocks);
        return blocks.find((b) => b.num == String(num).padStart(SSD.NUM_SIZE, "0"));
    }

    /* #endregion */
}