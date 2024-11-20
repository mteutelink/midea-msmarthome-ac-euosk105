# MIDEA-MSMARTHOME-AC-EUOSK105
This package contains NodeJS based services to control Midea devices via the Local Area Network (V3 protocol) using the EU-OSK105 wifi dongle. The package has been used as the underlying library for airconditioners control via the Homey Pro 2023 and has been tested against various split unit airconditioning devices from Carrier.

The library requires an MSmartHome account.

The knowledge to create this library is based on reverse engineering (LUA scripts, documents on the web etc.). Special thanks to Mac ZHou, NeoAcheron, Nenad Bogojevic and Rene Klootwijk.

## How to use

The Driver is the entrypoint of the service library and can be used to discover devices and retrieve one specific device based on its ID.
```js
	Driver.listDevices().then(devices: Device[] => {
		console.log(JSON.stringify(devices));
	})
```


Various actions have been implemented using the Command design pattern (`Get/SetState`, `GetCapabilities``, ListAppliances` and `ListHomeGroups`). In this example we retrieve the state from a device (`GetStateCommand`) and re-use that state object to adjust the device (`SetStateCommand`). The `GetStateResponse` and the `SetStateCommand` are subclasses of the `DeviceState` class.

Authentication is done by `device.authenticate(...)`. It accepts a `SecurityContext` object with the MSmartHome account email address and its password. It returns an updated SecurityContext with the cloud and local area network accesstoken and the TOKEN and KEY of the airconditioning appliance (necessary for the v3 communication protocol). Each device needs to be authenticated individually. 

Under the hood a user will be logged in into the MSmartHome Cloud and then locally to the device. Re-authentication into the cloud is not necessary for each device, which is handled in the authenticate method (uses the expired date of the cloud accesstoken to check whether a re-authenticate is necessary). The connection to the local device is using sockets and the timeout after 30 seconds, which then requires a re-authenticate locally (not cloud) which is handled under the hood.

```js
	Driver.getDevice(/*id*/123456789012345).then(async device: Device => {
		let securityContext: SecurityContext = new SecurityContext('<account>', '<password>');
		securityContext = await device.authenticate(securityContext);

		const getState: GetStateCommand = new GetStateCommand(device);
		let state: GetStateResponse = await getState.execute(securityContext);
		console.log(JSON.stringify(state));

		state.powerOn = true;
		const setState: SetStateCommand = new SetStateCommand(device, state);
		state: GetStateResponse = await setState.execute(securityContext);
		console.log(JSON.stringify(state));
	})
```

