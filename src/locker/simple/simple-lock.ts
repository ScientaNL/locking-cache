import {Lock} from "../locker.interface";
import {releaser} from "./simple-locker";

export class SimpleLock implements Lock {
	private released = false;

	constructor(public readonly key: string, private readonly lockReleaser: releaser) {}

	public unlock(): Promise<void> {
		if (this.released) {
			return Promise.resolve(undefined);
		}
		this.released = true;
		return this.lockReleaser();
	}
}
