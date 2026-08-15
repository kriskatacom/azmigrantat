import AppButton from "@/components/ui/AppButton";
import type { AuthUser, Gender, UpdateProfilePayload } from "@/types/auth";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import CountryField from "./country-field";
import GenderField from "./gender-field";
import ProfileField from "./profile-field";

interface ProfileDetailsFormProps {
  user: AuthUser;
  isSaving: boolean;
  onSave: (payload: UpdateProfilePayload) => Promise<void>;
}

export default function ProfileDetailsForm({
  user,
  isSaving,
  onSave,
}: ProfileDetailsFormProps) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [gender, setGender] = useState<Gender | null>(user.gender ?? null);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [country, setCountry] = useState(user.country ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [address, setAddress] = useState(user.address ?? "");

  useEffect(() => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setGender(user.gender ?? null);
    setPhone(user.phone ?? "");
    setCountry(user.country ?? "");
    setCity(user.city ?? "");
    setAddress(user.address ?? "");
  }, [user]);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <View style={styles.form}>
      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <ProfileField
            label="Име"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.nameField}>
          <ProfileField
            label="Фамилия"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>
      </View>
      <GenderField value={gender} onChange={setGender} />
      <ProfileField
        label="Телефон"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="Например: +359 88 123 4567"
      />
      <CountryField value={country} onChange={setCountry} />
      <ProfileField
        label="Град"
        value={city}
        onChangeText={setCity}
        autoCapitalize="words"
        placeholder="Въведете град"
      />
      <ProfileField
        label="Физически адрес"
        value={address}
        onChangeText={setAddress}
        autoCapitalize="words"
        autoComplete="street-address"
        placeholder="Улица, номер, пощенски код"
        multiline
        style={styles.address}
      />
      <AppButton
        title="Запази промените"
        loading={isSaving}
        disabled={!canSave}
        onPress={() =>
          void onSave({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            gender,
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
            address: address.trim(),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  nameRow: { flexDirection: "row", gap: 12 },
  nameField: { flex: 1 },
  address: { minHeight: 82, textAlignVertical: "top" },
});
