import { MIDEA_MESSAGE_TYPE } from '../Constants';
import { Security } from '../Security';
import { SecurityContext } from '../SecurityContext';

jest.mock('crypto', () => {
	const original = jest.requireActual('crypto');
	return {
		...original,
		randomBytes: jest.fn((amount) => Buffer.alloc(amount))
	}
});

describe('Security', () => {
	it('aesEncrypt', () => {
		const input = 'aa21ac8d000000000003418100ff03ff000200000000000000000000000003016971';
		const expected = 'b8436dd15e84d5a4fc6fbf77d2b12486e10c552981b23022cb71ea0fc54dc25ecfa0ce55888ac57fc42a7eacc3285d37';

		const result: Buffer = Security.aesEncrypt(Buffer.from(input, 'hex'));
		expect(result.toString('hex')).toEqual(expected);
	})
	it('aesDecrypt', () => {
		const input = '57a881f56188d47aedb866ea3adc3ba1ec3e86d1f99fcdc6d1d0f1654282ee67a1bb1fb74bf14ab4f30acedfe418d3a7b603c7ab66ee784b63b1ede79e4357ed00a463bf3e5488f1cbaa831cf91e396716c6d707176882c80eb8922d7b8b4b724bdfb3e16e33d88768cc4c3d0658937d0bb19369bf0317b24d3a4de9e6a13106';
		const expected = '0102a8c02c19000030303030303050303030303030305131313032433844324343353645303030300b6e65745f61635f433536450000870002000000000000000000ac00acac00000000102c8d2cc56e150029092122000300000000000000000000000000000000000000000000000000000000000000000000';

		const result: Buffer = Security.aesDecrypt(Buffer.from(input, 'hex'));
		expect(result.toString('hex')).toEqual(expected);
	})
	it('aesCbcEncrypt', () => {
		const input = '00005a5a01116800200000000000002c2f0b080b181481ea000000820000000000000000000000000000b8436dd15e84d5a4fc6fbf77d2b12486e10c552981b23022cb71ea0fc54dc25ecfa0ce55888ac57fc42a7eacc3285d371b68a6054ca044223e6ca262cf34192227f6a417aa4f';
		const key = "7b7b2009ddf8e6747d7ba06458f2b11ddb9444b5b6cd616b7f04b9e2bf706ad1";
		const expected = 'bc26c1ff0bc2c649dee8604146c2df0053f889ea1f430c7c7b7b7d25ebdb04427b774d7132a5d92ed278048cdc96e165599d6fb2d183d919074f3abaa81e7aa80da19593a65d1068dc7be9fa1c958174856120660cbcb0f6c65cd90c0cb8bef0da7cbe88c5c2b8f0b60bc455420f442e';

		const result: Buffer = Security.aesCbcEncrypt(Buffer.from(input, 'hex'), Buffer.from(key, 'hex'));
		expect(result.toString('hex')).toEqual(expected);
	})
	it('aesCbcDecrypt', () => {
		const input = '7e5b286f84e22cd4b970a6ac4ca04134f81eed1264aca93f08cdac9be0e0b1fae26f31609f05d419f30cd0fcc23038dc5ae6d755057e209f07a65e566ba465587575efa523d861384aed4f6701b5774c4f8536630d621e41124984a6512690ccbaa64cd964721e346174bf743165de2c';
		const key = "7b7b2009ddf8e6747d7ba06458f2b11ddb9444b5b6cd616b7f04b9e2bf706ad1";
		const expected = '00005a5a01116800208000000000026c2f0a080b181481ea00000082000000000000000001800000000068c5c69f67ba0c86139068a05121d3eec2183cc1fb8649a47a218ae51b1dfaf79123d235794a475e27c89084d03ac3f400b663746b3d2d196ea971388989c9e72f763b65280a';

		const result: Buffer = Security.aesCbcDecrypt(Buffer.from(input, 'hex'), Buffer.from(key, 'hex'));
		expect(result.toString('hex')).toEqual(expected);
	})
	it('sign', () => {
		const input = '{"appId":"1010","format":2,"clientType":1,"language":"en_US","src":"1010","stamp":"20241104222213","deviceId":"123456789012345","reqId":"6e8df903b95f5aa1","loginAccount":"user@email.com"}';
		const random = "12345678901234567890123456789012";
		const expected = 'b2e6a7cc1cff5025d5301ee5c2b4aadc12b038cd968515a0481c90f728021e42';

		const result: string = Security.sign(input, random);
		expect(result).toEqual(expected);
	})
	it('encryptPassword', () => {
		const loginId = "b0efc40e-c02a-4bc0-bae5-9ed541f4";
		const password = "P4ssw0rd!";
		const expected = '7e9917c31f921074ddc466d27369e66827844baec3fa9b06cd8a49235986ae75';

		const result: string = Security.encryptPassword(loginId, password);
		expect(result).toEqual(expected);
	})
	it('encryptIAMPassword', () => {
		const loginId = "b0efc40e-c02a-4bc0-bae5-9ed541f4";
		const password = "P4ssw0rd!";
		const expected = '287e28c2c771d03cd31cf7ff7ba170e8c7b787564efab59774ca096a28c0a732';

		const result: string = Security.encryptIAMPassword(loginId, password);
		expect(result).toEqual(expected);
	})
	it('encode32', () => {
		const input = '5a5a011168002000000000000006080c080b181481ea000000820000000000000000000000000000b8436dd15e84d5a4fc6fbf77d2b12486e10c552981b23022cb71ea0fc54dc25ecfa0ce55888ac57fc42a7eacc3285d37';
		const expected = '9ccb3804614a2af0279455d9e465c9b0';

		const result: Buffer = Security.encode32(Buffer.from(input, 'hex'));
		expect(result.toString('hex')).toEqual(expected);
	})
	it('encode8370', () => {
		const input = '5a5a0111680020000000000000000000070b181481ea000000820000000000000000000000000000b8436dd15e84d5a4fc6fbf77d2b12486e10c552981b23022cb71ea0fc54dc25ecfa0ce55888ac57fc42a7eacc3285d3780bb4b3f1212bf148536d70cc304e1e6';
		const expected = '8370008e2066304481c84c1d071dab33777b3fa1eeb153a17c4c011d34d780f3a3188deb80ecbf1bffcf8a0bae06efb9853b0597d21db00148fb64e6276f58bb29df5273bb6f0a543c6ccdd2dc542181836ccb4a24c9a2486c14ac3006af7c33027c66ddb9c36967b89470b00bc37e8cbd149b09e07dd85c908eeae34b9e39146810ab8b1560fa6c9b25b8a6fb838dd6c3dc5d88224b';

		const securityContext = new SecurityContext('user@email.com', 'P4ssw0rd!');
		securityContext.lanAccessToken = 'e19f1a98bf72d80142885d0813548326a077f323633d5ff4f8d7f96178c3da01';

		const result = Security.encode8370(securityContext, Buffer.from(input, 'hex'), 0, MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST);
		expect(result.data.toString('hex')).toEqual(expected);
	});
	it('decode8370', () => {
		const input = '8370008e2063315daaf4301a0a6b6b47239bdd0ec9625968bc29e6445e0510e46a91955bf038363392c68c2738aa2cdfcef587bb9c01d68834ff0e35c6801ff6fa39cbcbafbd7bcadb0974c3eb92f22c3d3f701726840ee5b9de7815f501c4f6a35b919daaa012f05a2c4e11890bd208cb28c162164c9598333f787672909cc62ddda4378420f4afbc0e4d14ad7555e5792db559efcb';
		const expected = '5a5a011168002080000000000b07080b080b181481ea00000082000000000000000001800000000068c5c69f67ba0c86139068a05121d3ee43ccd1845c128915002fad40511bf42f3febeb492c1b906825abc5e7aa4d0cdb588872c8684108f72dc9021ba8bcc8bd';

		const securityContext = new SecurityContext('user@email.com', 'P4ssw0rd!');
		securityContext.lanAccessToken = '1d08a2a74251e7ceb82e25df610a35a44f12420cdc9d67d3c32bbe5a7c34ed69';

		const result = Security.decode8370(securityContext, Buffer.from(input, 'hex'));
		expect(result[0].toString('hex')).toEqual(expected);
	});
	it('decode8370 should throw error with message "Not an 8370 message"', () => {
		const t = () => {
			const input = '5a5a0111680020000000000000000000070b181481ea000000820000000000000000000000000000b8436dd15e84d5a4fc6fbf77d2b12486e10c552981b23022cb71ea0fc54dc25ecfa0ce55888ac57fc42a7eacc3285d3780bb4b3f1212bf148536d70cc304e1e6';
			const expected = '8370008e2066304481c84c1d071dab33777b3fa1eeb153a17c4c011d34d780f3a3188deb80ecbf1bffcf8a0bae06efb9853b0597d21db00148fb64e6276f58bb29df5273bb6f0a543c6ccdd2dc542181836ccb4a24c9a2486c14ac3006af7c33027c66ddb9c36967b89470b00bc37e8cbd149b09e07dd85c908eeae34b9e39146810ab8b1560fa6c9b25b8a6fb838dd6c3dc5d88224b';

			const securityContext = new SecurityContext('user@email.com', 'P4ssw0rd!');
			securityContext.lanAccessToken = 'e19f1a98bf72d80142885d0813548326a077f323633d5ff4f8d7f96178c3da01';

			const result = Security.decode8370(securityContext, Buffer.from(input, 'hex'));
		};
		expect(t).toThrow('not an 8370 message');
	});
	it('decode8370 should throw error with message "Sign does not match"', () => {
		const t = () => {
			const input = '8370008e2063315daaf4301a0a6b6b47239bdd0ec9625968bc29e6445e0510e46a91955bf038363392c68c2738aa2cdfcef587bb9c01d68834ff0e35c6801ff6fa39cbcbafbd7bcadb0974c3eb92f22c3d3f701726840ee5b9de7815f501c4f6a35b919daaa012f05a2c4e11890bd208cb28c162164c9598333f787672909cc62ddda4378420f4afbc0e4d14ad7555e5792db559efcb';
			const expected = '5a5a011168002080000000000b07080b080b181481ea00000082000000000000000001800000000068c5c69f67ba0c86139068a05121d3ee43ccd1845c128915002fad40511bf42f3febeb492c1b906825abc5e7aa4d0cdb588872c8684108f72dc9021ba8bcc8bd';

			const securityContext = new SecurityContext('user@email.com', 'P4ssw0rd!');
			securityContext.lanAccessToken = 'e19f1a98bf72d80142885d0813548326a077f323633d5ff4f8d7f96178c3da01';

			const result = Security.decode8370(securityContext, Buffer.from(input, 'hex'));
		};
		expect(t).toThrow('sign does not match');
	});
});