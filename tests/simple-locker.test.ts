import { expect } from "chai";
import {describe} from "mocha";
import {SimpleLock, SimpleLocker} from "../src";

describe('simple-locker', () => {
	it('should lock and unlock by id', async () => {
		const lockId = 'lock1';
		const locker: SimpleLocker = new SimpleLocker();

		const lock = await locker.lock(lockId);
		expect(lock.key).to.eq(lockId);
		expect(locker.isLocked(lockId)).to.eq(true);

		await new Promise( resolve => setTimeout(resolve, 0) );

		await lock.unlock();
		expect(locker.isLocked(lockId)).to.eq(false);
	});

	it('should block-lock same key', async () => {
		const lockId = 'lock1';
		const locker: SimpleLocker = new SimpleLocker();

		const lock1 = await locker.lock(lockId);
		expect(lock1.key).to.eq(lockId);
		expect(locker.isLocked(lockId)).to.eq(true);

		let lock2: SimpleLock|null = null;
		const lock2Promise = locker.lock(lockId);
		lock2Promise.then(lock => {
			lock2 = lock;
			expect(lock.key).to.eq(lockId);
			expect(locker.isLocked(lockId)).to.eq(true);
		})

		await new Promise( resolve => setTimeout(resolve, 0) );

		expect(lock2).to.eq(null);
		await lock1.unlock();
		expect(locker.isLocked(lockId)).to.eq(true);

		await new Promise( resolve => setTimeout(resolve, 0) );

		expect(lock2).to.be.instanceOf(SimpleLock);
		await lock2!.unlock();
		expect(locker.isLocked(lockId)).to.eq(false);
	});

	it('should not block-lock different keys', async () => {
		const lockId1 = 'lock1';
		const lockId2 = 'lock2';
		const locker: SimpleLocker = new SimpleLocker();

		const lock1 = await locker.lock(lockId1);
		expect(lock1.key).to.eq(lockId1);
		expect(locker.isLocked(lockId1)).to.eq(true);

		const lock2 = await locker.lock(lockId2);
		expect(lock2.key).to.eq(lockId2);
		expect(locker.isLocked(lockId2)).to.eq(true);

		await new Promise( resolve => setTimeout(resolve, 0) );

		await lock2.unlock();
		expect(locker.isLocked(lockId1)).to.eq(true);
		expect(locker.isLocked(lockId2)).to.eq(false);

		await lock1.unlock();
		expect(locker.isLocked(lockId1)).to.eq(false);
	});
});
