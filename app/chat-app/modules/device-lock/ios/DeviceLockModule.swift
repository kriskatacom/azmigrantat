import ExpoModulesCore
import LocalAuthentication
import Security

public class DeviceLockModule: Module {
  private let account = "azmigrantat.device-lock.passcode"
  private let service = "azmigrantat.device-lock"

  public func definition() -> ModuleDefinition {
    Name("DeviceLock")

    AsyncFunction("authenticateDeviceCredential") { (title: String, subtitle: String?, description: String?) -> Bool in
      let reason = [description, subtitle, title].compactMap { $0 }.first { !$0.isEmpty } ?? title

      var aclError: Unmanaged<CFError>?
      guard let access = SecAccessControlCreateWithFlags(
        nil,
        kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        .devicePasscode,
        &aclError
      ) else {
        return false
      }

      let addQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecAttrService as String: service,
        kSecAttrAccessControl as String: access,
        kSecValueData as String: Data("1".utf8)
      ]
      let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
      if addStatus != errSecSuccess && addStatus != errSecDuplicateItem {
        return false
      }

      let context = LAContext()
      context.localizedCancelTitle = "Отказ"
      context.touchIDAuthenticationAllowableReuseDuration = 0
      context.localizedFallbackTitle = ""

      let readQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecAttrService as String: service,
        kSecUseOperationPrompt as String: reason,
        kSecUseAuthenticationContext as String: context,
        kSecReturnData as String: true
      ]

      let status = SecItemCopyMatching(readQuery as CFDictionary, nil)
      return status == errSecSuccess
    }
  }
}
