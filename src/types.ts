export const UploadV1: string = ""
export const DownloadV1: string = ""
export const BranchV1: string = ""

export interface Client {
  Ip: string;
  Port: string;
  PublicKey: string;
}

export interface UploadMessage {
	Root:   string
	Count:  number
	Leaf:   any //merkle_dag.DagLeaf
	Parent: string
	Branch: any //*merkle_dag.ClassicTreeBranch
}

export interface DownloadMessage {
	Root: string
	Label: string | null
	Hash: string | null
	Range: LeafRange | null
}

export interface BlockData {
	Leaf: any //merkle_dag.DagLeaf
	Branch: any //merkle_dag.ClassicTreeBranch
}

export interface LeafRange {
	From: number
	To:   number
}

export interface ResponseMessage {
	Ok: boolean
}

export interface ErrorMessage {
	Message: string
}