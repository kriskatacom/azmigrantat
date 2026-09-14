import { registerWebModule, NativeModule } from 'expo';

class BunnyNativeUploadModule extends NativeModule<{}> {}

export default registerWebModule(BunnyNativeUploadModule, 'BunnyNativeUploadModule');
