import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

export default function PendingApprovalScreen() {
  const { logout } = useAuth();
  return (
    <View style={styles.container}>
      <View style={styles.icon}><Ionicons name="time-outline" size={44} color={theme.colors.brand} /></View>
      <Text style={styles.title}>Cadastro em análise</Text>
      <Text style={styles.text}>
        Seus dados foram enviados para análise. Você poderá ficar online e receber corridas depois que o administrador aprovar seu cadastro.
      </Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles=StyleSheet.create({
 container:{flex:1,backgroundColor:theme.colors.bg,alignItems:"center",justifyContent:"center",padding:28},
 icon:{width:88,height:88,borderRadius:28,backgroundColor:"rgba(16,185,129,0.15)",alignItems:"center",justifyContent:"center",marginBottom:22},
 title:{color:theme.colors.text,fontSize:26,fontWeight:"800",textAlign:"center"},
 text:{color:theme.colors.textSecondary,fontSize:15,lineHeight:22,textAlign:"center",marginTop:12},
 button:{marginTop:28,paddingHorizontal:24,paddingVertical:14,borderRadius:12,backgroundColor:theme.colors.bgCard,borderWidth:1,borderColor:theme.colors.border},
 buttonText:{color:theme.colors.text,fontWeight:"700"}
});
