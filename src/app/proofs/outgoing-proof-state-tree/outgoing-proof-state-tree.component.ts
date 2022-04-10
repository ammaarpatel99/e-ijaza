import {Component, Input} from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import {OutgoingProofRequest} from "@project-types/interface-api";

export type TreeNode = OutgoingProofRequest

/**
 * Flattened tree node that has been created from a FileNode through the flattener. Flattened
 * nodes include level index and whether they can be expanded or not.
 */
export interface FlatTreeNode extends OutgoingProofRequest {
  level: number;
}

@Component({
  selector: 'app-outgoing-proof-state-tree',
  templateUrl: './outgoing-proof-state-tree.component.html',
  styleUrls: ['./outgoing-proof-state-tree.component.scss']
})
export class OutgoingProofStateTreeComponent {
  @Input()
  set proof(proof: OutgoingProofRequest) {
    this.dataSource.data = [proof]
  }

  /** The TreeControl controls the expand/collapse state of tree nodes.  */
  treeControl: FlatTreeControl<FlatTreeNode>;

  /** The TreeFlattener is used to generate the flat list of items from hierarchical data. */
  treeFlattener: MatTreeFlattener<TreeNode, FlatTreeNode>;

  /** The MatTreeFlatDataSource connects the control and flattener to provide data. */
  dataSource: MatTreeFlatDataSource<TreeNode, FlatTreeNode>;

  constructor() {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren);

    this.treeControl = new FlatTreeControl(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  }

  /** Transform the data to something the tree can read. */
  transformer(node: TreeNode, level: number): FlatTreeNode {
    return {
      ...node,
      level
    };
  }

  /** Get the level of the node */
  getLevel(node: FlatTreeNode): number {
    return node.level;
  }

  /** Get whether the node is expanded or not. */
  isExpandable(node: FlatTreeNode): boolean {
    return Array.isArray(node.proof);
  }

  /** Get whether the node has children or not. */
  hasChild(index: number, node: FlatTreeNode): boolean {
    return Array.isArray(node.proof);
  }

  /** Get the children for the node. */
  getChildren(node: TreeNode): TreeNode[] | null | undefined {
    const proof = node.proof
    if (Array.isArray(proof)) return proof
    else if (proof === null) return undefined
    return null;
  }
}
