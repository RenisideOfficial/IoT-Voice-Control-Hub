// Device control functions
export async function controlDevice(device, state) {
  try {
    const response = await apiClient.post(`/device/${device}/control/`, {
      state: state,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || `Failed to control ${device}`
    );
  }
}

export async function getDeviceState(device) {
  try {
    const response = await apiClient.get(`/device/${device}/state/`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || `Failed to get ${device} state`
    );
  }
}

export async function getAllDeviceStates() {
  try {
    const devices = ["main", "lamp", "fan", "ac"];
    const states = {};

    for (const device of devices) {
      try {
        const response = await apiClient.get(`/device/${device}/state/`);
        states[device] = response.data.state;
      } catch (error) {
        console.error(`Failed to get ${device} state:`, error);
        states[device] = false;
      }
    }

    return states;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to get device states"
    );
  }
}
