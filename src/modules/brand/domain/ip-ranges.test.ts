import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Loaded by URL so the same file runs under `node --test` (which needs the .ts extension)
// and type-checks under tsc (which rejects .ts extensions in static imports).
const ipRangesModule = new URL("./ip-ranges.ts", import.meta.url).href;
const { isPublicAddress } = (await import(ipRangesModule)) as typeof import("./ip-ranges");

describe("isPublicAddress", () => {
	it("accepts public IPv4 and IPv6 addresses", () => {
		for (const ip of [
			"8.8.8.8",
			"1.1.1.1",
			"104.18.0.1",
			"2606:4700:4700::1111",
			"2001:4860::8888",
		]) {
			assert.equal(isPublicAddress(ip), true, ip);
		}
	});

	it("rejects private, loopback, link-local and metadata IPv4", () => {
		for (const ip of [
			"127.0.0.1",
			"127.255.255.254",
			"10.0.0.1",
			"172.16.0.1",
			"172.31.255.255",
			"192.168.1.10",
			"169.254.169.254",
			"100.64.0.1",
			"0.0.0.0",
			"224.0.0.1",
			"255.255.255.255",
		]) {
			assert.equal(isPublicAddress(ip), false, ip);
		}
	});

	it("keeps the edges of 172.16/12 straight", () => {
		assert.equal(isPublicAddress("172.15.255.255"), true);
		assert.equal(isPublicAddress("172.32.0.0"), true);
	});

	it("rejects private and special IPv6, including IPv4 embedded in IPv6", () => {
		for (const ip of [
			"::1",
			"::",
			"[::1]",
			"fc00::1",
			"fd12:3456:789a::1",
			"fe80::1",
			"fe80::1%en0",
			"febf::1",
			"ff02::1",
			"2001:db8::1",
			"::ffff:127.0.0.1",
			"::ffff:169.254.169.254",
			"::ffff:a9fe:a9fe",
			"64:ff9b::10.0.0.1",
			"2002:c0a8:0101::1",
		]) {
			assert.equal(isPublicAddress(ip), false, ip);
		}
		assert.equal(isPublicAddress("::ffff:8.8.8.8"), true);
	});

	it("rejects anything that is not an IP", () => {
		for (const ip of [
			"",
			"localhost",
			"256.1.1.1",
			"1.2.3",
			"01:02:03",
			"1::2::3",
			"example.com",
		]) {
			assert.equal(isPublicAddress(ip), false, ip);
		}
	});
});
