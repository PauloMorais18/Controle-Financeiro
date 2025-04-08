import { View, Text, StyleSheet, Alert } from "react-native"

import { Button } from "../components/buttons"

export default function Index() {
    function handleMessage(){
        return Alert.alert("Olá Paulão")
    }
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hello world!</Text>

            <Button />
            {/*<Button title="Enviar" onPress={handleMessage}></Button>*/}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 32,
        justifyContent: "center",
    },
    title: {
        color: "red",
        fontSize: 24,
        fontWeight: "bold",
    },
});